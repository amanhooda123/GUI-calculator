"""Own data audit/converter. Does not import or execute external repository code."""
import hashlib,json,math
from pathlib import Path
from urllib.request import Request,urlopen
import pandas as pd
import numpy as np
import pyarrow.parquet as pq
OUT=Path("reports-options-real")
CACHE=Path("data/options-archive")
OUT.mkdir(exist_ok=True);CACHE.mkdir(parents=True,exist_ok=True)
BASE="https://github.com/lambdaclass/options_portfolio_backtester/releases/download/data-v1/"
HASHES={
 "SPY_options.parquet":"a7152991b45b81f090f970e945bf88def8093b8ecb9b250e9891cb6d88041f0a",
 "SPY_underlying.parquet":"847e60a441eb10969d87cd4a6da604257b782d9076168f68d5730b84096c79db"}
sources=[]
for name,expected in HASHES.items():
 target=CACHE/name
 h=hashlib.sha256()
 if not target.exists():
  with urlopen(Request(BASE+name,headers={"User-Agent":"options-research/0.3"}),timeout=120) as response,target.open("wb") as dest:
   while True:
    b=response.read(1<<20)
    if not b:break
    dest.write(b);h.update(b)
 else:
  with target.open("rb") as source:
   for b in iter(lambda:source.read(1<<20),b""):h.update(b)
 actual=h.hexdigest()
 if actual!=expected:raise ValueError("Archive hash mismatch "+name+" "+actual)
 sources.append({"file":name,"url":BASE+name,"sha256":actual,"bytes":target.stat().st_size})
 print("Verified",name,target.stat().st_size,flush=True)
und=pd.read_parquet(CACHE/"SPY_underlying.parquet")
und["date"]=pd.to_datetime(und["date"]).dt.strftime("%Y-%m-%d")
und=und[(und.date>="2019-01-01") & (und.date<="2025-12-31")].copy()
for c in ["open","high","low","close"]:und[c]=pd.to_numeric(und[c],errors="raise")
if und["date"].duplicated().any():raise ValueError("Duplicate underlying date")
if any(not math.isfinite(float(v)) for c in ["open","high","low","close"] for v in und[c]):raise ValueError("Invalid underlying values")
und["symbol"]="SPY"
und[["date","symbol","open","high","low","close"]].to_csv(CACHE/"prices.csv",index=False)
close_by_date=und.set_index("date")["close"]
pf=pq.ParquetFile(CACHE/"SPY_options.parquet")
cols=["date","contract_id","type","strike","expiration","bid","ask","open_interest"]
missing=set(cols)-set(pf.schema_arrow.names)
if missing:raise ValueError("Missing options schema: "+str(missing))
print("OPTIONS_SCHEMA",str(pf.schema_arrow),flush=True)
ids=set();scanned=0
def normalize(batch):
 df=batch.to_pandas()
 df["date"]=pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
 df["expiration"]=pd.to_datetime(df["expiration"]).dt.strftime("%Y-%m-%d")
 return df[(df.date>="2020-01-01") & (df.date<="2025-12-31")].copy()
for batch in pf.iter_batches(batch_size=200000,columns=["date","contract_id","strike","expiration"]):
 df=normalize(batch);scanned+=len(df)
 if df.empty:continue
 spot=df.date.map(close_by_date)
 dte=(pd.to_datetime(df.expiration)-pd.to_datetime(df.date)).dt.days
 strike=pd.to_numeric(df.strike,errors="coerce")
 eligible=(dte>=7)&(dte<=90)&(strike/spot>=0.95)&(strike/spot<=1.05)
 ids.update(df.loc[eligible,"contract_id"].astype(str))
print("Potential entry contracts",len(ids),flush=True)
output=CACHE/"options.csv"
output.write_text("date,symbol,contract,expiration,type,strike,bid,ask,open_interest,multiplier\n")
kept=invalid=0;typemap={"c":"call","p":"put","call":"call","put":"put"}
first=last=None;date_counts={}
for batch in pf.iter_batches(batch_size=200000,columns=cols):
 df=normalize(batch)
 if df.empty:continue
 df["contract_id"]=df.contract_id.astype(str)
 df=df[df.contract_id.isin(ids)].copy()
 if df.empty:continue
 for col in ["strike","bid","ask","open_interest"]:df[col]=pd.to_numeric(df[col],errors="coerce")
 df["type"]=df.type.astype(str).str.lower().map(typemap)
 numeric=df[["strike","bid","ask","open_interest"]]
 finite=np.isfinite(numeric.to_numpy(dtype=float)).all(axis=1)
 good=(finite & (df.strike>0)&(df.bid>=0)&(df.ask>0)&(df.ask>=df.bid)&
       (df.open_interest>=0)&((df.open_interest%1)==0)&df.type.notna()&
       (df.date<=df.expiration)&df.date.isin(close_by_date.index))
 invalid+=int((~good).sum())
 df=df[good].copy()
 if df.empty:continue
 df["symbol"]="SPY";df["contract"]=df.contract_id
 df["multiplier"]=100
 df[["date","symbol","contract","expiration","type","strike","bid","ask","open_interest","multiplier"]].to_csv(output,mode="a",index=False,header=False)
 kept+=len(df)
 dmin=df.date.min();dmax=df.date.max()
 first=dmin if first is None else min(first,dmin)
 last=dmax if last is None else max(last,dmax)
 for d,n in df.date.value_counts().items():date_counts[d]=date_counts.get(d,0)+int(n)
if not kept or last<"2024-01-01":raise ValueError("Insufficient options test coverage")
# Stop at observed quote coverage, never extend a chain using fabricated marks.
und=und[und.date<=last]
und[["date","symbol","open","high","low","close"]].to_csv(CACHE/"prices.csv",index=False)
manifest={"source":"lambdaclass/options_portfolio_backtester data-v1 third-party historical archive",
 "sourceNotice":"https://github.com/lambdaclass/options_portfolio_backtester/blob/master/data/DATA_NOTICE.md",
 "originalUpstreamDocumented":False,"independentlyVerified":False,
 "sources":sources,"priceBasis":"Source underlying raw OHLC, matched to source options",
 "coverage":{"firstOptionsDate":first,"lastOptionsDate":last,"priceSessions":len(und),
   "optionSessions":len(date_counts),"validQuotes":kept,"invalidQuotesExcluded":invalid,
   "potentialEntryContracts":len(ids),"sourceRowsInDateWindow":scanned},
 "normalizedPriceSHA256":hashlib.sha256((CACHE/"prices.csv").read_bytes()).hexdigest(),
 "normalizedQuoteSHA256":hashlib.sha256(output.read_bytes()).hexdigest(),
 "pointInTimeOpenInterestVerified":False,
 "fillAssumption":"Daily source quotes assumed executable with adverse slippage; not verified live fills",
 "rawDataRedistributed":False}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print("OPTIONS_DATA_MANIFEST",json.dumps(manifest),flush=True)
