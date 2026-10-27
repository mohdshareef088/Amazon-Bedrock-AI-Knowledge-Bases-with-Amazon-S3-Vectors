import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import boto3
from dotenv import load_dotenv

# Force load environment variables from .env file
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return FileResponse("index.html")

bedrock_client = boto3.client(
    service_name="bedrock-agent-runtime",
    region_name=os.getenv("AWS_REGION", "ap-southeast-2")
)

class Query(BaseModel):
    message: str

@app.post("/api/chat")
def chat(query: Query):
    # Fetch environment variables
    kb_id = os.getenv("BEDROCK_KB_ID")
    model_arn = os.getenv("BEDROCK_MODEL_ARN", "arn:aws:bedrock:ap-southeast-2:190176595792:inference-profile/global.amazon.nova-2-lite-v1:0")

    # Guard check for missing environment configuration
    if not kb_id:
        raise HTTPException(
            status_code=500, 
            detail="BEDROCK_KB_ID environment variable is missing in .env file."
        )

    try:
        response = bedrock_client.retrieve_and_generate(
            input={'text': query.message},
            retrieveAndGenerateConfiguration={
                'type': 'KNOWLEDGE_BASE',
                'knowledgeBaseConfiguration': {
                    'knowledgeBaseId': kb_id,
                    'modelArn': model_arn
                }
            }
        )
        
        answer = response.get("output", {}).get("text", "No answer found.")
        sources = [
            ref["location"]["s3Location"]["uri"]
            for citation in response.get("citations", [])
            for ref in citation.get("retrievedReferences", [])
            if "s3Location" in ref.get("location", {})
        ]

        return {"answer": answer, "sources": list(set(sources))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
