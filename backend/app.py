from pathlib import Path
import time
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, silhouette_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import NearestNeighbors
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)
CORS(app)
DATA_PATH = Path(__file__).parent / 'data' / 'spotify_tracks.csv'
FEATURES = ['danceability','energy','valence','acousticness','instrumentalness','speechiness','liveness','tempo','popularity']
SCATTER_LIMIT = 1500


def load_data():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f'Dataset not found: {DATA_PATH}. Copy your licensed spotify_tracks.csv into backend/data/.')
    d = pd.read_csv(DATA_PATH).rename(columns={'track_name':'title','artists':'artist','track_genre':'genre'})
    required = ['track_id','title','artist','genre',*FEATURES]
    missing = [c for c in required if c not in d.columns]
    if missing: raise ValueError(f'Dataset missing columns: {missing}')
    original = len(d)
    d = d.dropna(subset=['track_id']).copy()
    d['track_id'] = d['track_id'].astype(str).str.strip()
    d = d[d.track_id.ne('')]
    before = len(d)
    d = d.drop_duplicates('track_id', keep='first').copy()
    duplicates = before-len(d)
    d = d.dropna(subset=['title','artist','genre']).copy()
    for c in ['title','artist','genre']:
        d[c] = d[c].astype(str).str.strip()
        d = d[d[c].ne('')].copy()
    for c in FEATURES:
        d[c] = pd.to_numeric(d[c], errors='coerce')
        med = d[c].median()
        d[c] = d[c].fillna(0 if pd.isna(med) else float(med))
    d['popularity'] = d['popularity'].clip(0,100)/100.0
    for c in ['danceability','energy','valence','acousticness','instrumentalness','speechiness','liveness']:
        d[c] = d[c].clip(0,1)
    d['tempo'] = d['tempo'].clip(30,250)
    # Heuristic labels, not human-annotated emotion labels.
    def mood_rule(r):
        if r.energy >= .70: return 'Intense' if r.valence < .45 else 'Happy'
        if r.valence < .35: return 'Sad'
        return 'Calm'
    d['mood'] = d.apply(mood_rule, axis=1)
    d = d.reset_index(drop=True)
    clean = {'original_rows':int(original),'rows_after_cleaning':int(len(d)),
             'duplicate_track_ids_removed':int(duplicates),
             'missing_feature_values_after_cleaning':int(d[FEATURES].isna().sum().sum()),
             'dataset_path':str(DATA_PATH.resolve())}
    return d, clean


df, CLEANING = load_data()


def arg_int(name, default, low, high):
    try: x = int(request.args.get(name, default))
    except (TypeError, ValueError): x = default
    return min(max(x, low), high)


def track_dict(r):
    item = {'track_id':str(r.track_id),'title':str(r.title),'artist':str(r.artist),
            'genre':str(r.genre),'mood':str(r.mood)}
    for c in FEATURES: item[c] = round(float(getattr(r,c)), 1 if c == 'tempo' else 3)
    return item


def rank_tracks(idx, method, limit):
    n = len(df)
    if n <= 1: return []
    if method == 'popularity':
        scores = df.popularity.to_numpy(dtype=float).copy(); scores[idx] = -np.inf
        ids = np.argsort(-scores)[:limit]
        return [(int(i), float(scores[i])) for i in ids]
    X = StandardScaler().fit_transform(df[FEATURES].to_numpy(dtype=float))
    if method == 'knn':
        model = NearestNeighbors(n_neighbors=min(limit+1,n), metric='euclidean').fit(X)
        distances, indices = model.kneighbors(X[idx].reshape(1,-1))
        pairs = [(int(i),float(1/(1+d))) for i,d in zip(indices[0],distances[0]) if int(i)!=idx]
        return sorted(pairs,key=lambda p:p[1],reverse=True)[:limit]
    if method == 'cosine':
        scores = cosine_similarity(X[idx:idx+1],X).ravel(); scores[idx] = -np.inf
        ids = np.argsort(-scores)[:limit]
        return [(int(i),float(scores[i])) for i in ids]
    raise ValueError('Unsupported method')


@app.get('/api/health')
def health(): return jsonify({'status':'ok','service':'Moodify AI API','tracks':len(df)})

@app.get('/api/debug-data')
def debug_data():
    return jsonify({'data_path':str(DATA_PATH.resolve()),'loaded_tracks':len(df),
                    'first_five_titles':df.title.head(5).tolist(),'first_five_ids':df.track_id.head(5).astype(str).tolist()})

@app.get('/api/tracks')
def tracks():
    q=request.args.get('q','').strip(); mood=request.args.get('mood','').strip(); genre=request.args.get('genre','').strip()
    limit=arg_int('limit',100,1,500); view=df
    if q: view=view[view.title.str.contains(q,case=False,regex=False,na=False)|view.artist.str.contains(q,case=False,regex=False,na=False)]
    if mood: view=view[view.mood.str.casefold()==mood.casefold()]
    if genre: view=view[view.genre.str.casefold()==genre.casefold()]
    return jsonify({'tracks':[track_dict(r) for r in view.head(limit).itertuples(index=False)],'total':int(len(view))})

@app.get('/api/moods')
def moods(): return jsonify({'moods':sorted(df.mood.unique().tolist()),'genres':sorted(df.genre.dropna().unique().tolist())})

@app.get('/api/recommendations/<track_id>')
def recommendations(track_id):
    method=request.args.get('method','cosine').lower(); limit=arg_int('limit',8,1,20)
    found=np.flatnonzero(df.track_id.astype(str).to_numpy()==str(track_id))
    if not len(found): return jsonify({'error':'Track not found'}),404
    idx=int(found[0])
    try: ranked=rank_tracks(idx,method,limit)
    except ValueError as e: return jsonify({'error':str(e),'supported_methods':['cosine','knn','popularity']}),400
    out=[]
    for i,score in ranked:
        t=track_dict(df.iloc[i]); t['similarity']=round(score,4); out.append(t)
    return jsonify({'source':track_dict(df.iloc[idx]),'method':method,'recommendations':out})

@app.get('/api/analytics')
def analytics():
    limit=arg_int('scatter_limit',SCATTER_LIMIT,100,3000)
    sample=df.sample(n=min(limit,len(df)),random_state=42) if len(df)>limit else df
    return jsonify({'total_tracks':len(df),
      'mood_counts':[{'name':str(k),'value':int(v)} for k,v in df.mood.value_counts().items()],
      'genre_counts':[{'name':str(k),'value':int(v)} for k,v in df.genre.value_counts().head(30).items()],
      'scatter':[{'title':str(r.title),'artist':str(r.artist),'mood':str(r.mood),'energy':float(r.energy),'valence':float(r.valence),'tempo':float(r.tempo)} for r in sample.itertuples(index=False)],
      'scatter_sample_size':len(sample),'features':[{'feature':c,'mean':round(float(df[c].mean()),4),'std':round(float(df[c].std()),4)} for c in FEATURES],
      'cleaning':CLEANING,'mood_label_note':'Mood labels are heuristic proxies derived from audio features, not human-verified labels.'})

@app.get('/api/model-comparison')
def model_comparison():
    if len(df)<30 or df.mood.nunique()<2: return jsonify({'error':'Insufficient data for evaluation'}),400
    X=df[FEATURES].astype(float); enc=LabelEncoder(); y=enc.fit_transform(df.mood)
    Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=.25,random_state=42,stratify=y)
    classification=[]
    models=[('Random Forest',RandomForestClassifier(n_estimators=120,random_state=42,class_weight='balanced',n_jobs=-1,min_samples_leaf=2)),('Decision Tree',DecisionTreeClassifier(random_state=42,class_weight='balanced',min_samples_leaf=5))]
    for name,est in models:
        pipe=make_pipeline(StandardScaler(),est); start=time.perf_counter(); pipe.fit(Xtr,ytr); pred=pipe.predict(Xte); elapsed=time.perf_counter()-start
        classification.append({'model':name,'accuracy':round(float(accuracy_score(yte,pred)),4),'precision_macro':round(float(precision_score(yte,pred,average='macro',zero_division=0)),4),'recall_macro':round(float(recall_score(yte,pred,average='macro',zero_division=0)),4),'f1_macro':round(float(f1_score(yte,pred,average='macro',zero_division=0)),4),'confusion_matrix':confusion_matrix(yte,pred).tolist(),'class_names':enc.classes_.tolist(),'fit_predict_seconds':round(elapsed,3)})
    size=min(1500,len(df)); pos=np.random.RandomState(42).choice(len(df),size=size,replace=False); xc=StandardScaler().fit_transform(X.iloc[pos].to_numpy())
    clustering=[]
    for name,labels in [('K-Means',KMeans(n_clusters=4,random_state=42,n_init=10).fit_predict(xc)),('Agglomerative',AgglomerativeClustering(n_clusters=4).fit_predict(xc))]:
        clustering.append({'model':name,'silhouette':round(float(silhouette_score(xc,labels,sample_size=min(1000,size),random_state=42)),4),'sample_size':int(size),'clusters':int(len(np.unique(labels)))})
    return jsonify({'dataset':{'tracks':len(df),'features':FEATURES,'classification_train_size':len(Xtr),'classification_test_size':len(Xte),'clustering_sample_size':size,'random_state':42},'classification':classification,'clustering':clustering,'interpretation':'Classification predicts rule-generated labels, not verified human emotions. Clustering metrics are not directly comparable to classification metrics.'})

@app.get('/api/recommendation-evaluation')
def recommendation_evaluation():
    k=arg_int('k',10,1,10); n_samples=arg_int('samples',40,10,100)
    rng=np.random.RandomState(42); query_ids=rng.choice(len(df),size=min(n_samples,len(df)),replace=False)
    X=StandardScaler().fit_transform(df[FEATURES].to_numpy(dtype=float)); popular=np.argsort(-df.popularity.to_numpy())
    nn=NearestNeighbors(n_neighbors=min(k+1,len(df)),metric='euclidean').fit(X)
    sums={name:[] for name in ['Popularity baseline','Cosine similarity','KNN']}
    for idx in query_ids:
        mood=df.iloc[idx].mood; relevant=max(1,int((df.mood==mood).sum())-1)
        scores=cosine_similarity(X[idx:idx+1],X).ravel(); scores[idx]=-np.inf
        cos=np.argsort(-scores)[:k].tolist()
        dist,inds=nn.kneighbors(X[idx].reshape(1,-1)); knn=[int(i) for i in inds[0] if int(i)!=idx][:k]
        pop=[int(i) for i in popular if int(i)!=idx][:k]
        for name,ids in [('Popularity baseline',pop),('Cosine similarity',cos),('KNN',knn)]:
            hits=np.array([1.0 if df.iloc[j].mood==mood else 0.0 for j in ids]); precision=float(hits.sum()/max(1,len(ids))); recall=float(hits.sum()/relevant)
            discounts=1/np.log2(np.arange(2,len(hits)+2)); dcg=float((hits*discounts).sum()); ideal=np.ones(min(k,relevant)); idcg=float((ideal/np.log2(np.arange(2,len(ideal)+2))).sum())
            sums[name].append((precision,recall,dcg/idcg if idcg else 0.0))
    return jsonify({'protocol':'Same heuristic mood as the query track is proxy-relevant. This is mood consistency, not human satisfaction.','k':k,'sampled_query_tracks':len(query_ids),'random_state':42,'results':[{'model':name,'precision_at_k':round(float(np.mean([x[0] for x in vals])),4),'recall_at_k':round(float(np.mean([x[1] for x in vals])),6),'ndcg_at_k':round(float(np.mean([x[2] for x in vals])),4)} for name,vals in sums.items()]})

if __name__=='__main__':
    print(f'Moodify AI API loaded with {len(df):,} cleaned tracks from {DATA_PATH.resolve()}')
    app.run(host='127.0.0.1',port=5001,debug=False)
