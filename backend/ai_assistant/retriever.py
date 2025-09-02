import psycopg2
import os
from openai import OpenAI
from dotenv import load_dotenv
import numpy as np
from datetime import date

# Load environment
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)
EMBED_MODEL = "text-embedding-3-small"
RAG_TABLE = "rag_chunks4"

# Global variable to store Q&A history
conversation_history = []  # Stores (question, answer) tuples

def get_text_embedding(text):
    """Generate a normalized embedding vector for the given text using an embedding model."""
    response = client.embeddings.create(
        model=EMBED_MODEL,
        input=text
    )
    vec = np.array(response.data[0].embedding)
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec.tolist()  # edge case
    return (vec / norm).tolist()  # normalize for cosine

def get_top_k_chunks(query_text, rag_table=RAG_TABLE, k=50):
    """Retrieve the top-k most relevant chunks from the RAG table based on semantic similarity to the query."""
    embedding = get_text_embedding(query_text)
    with psycopg2.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT chunk_text, metadata
                FROM {rag_table}
                ORDER BY embedding <#> %s::vector
                LIMIT %s;
            """, (embedding, k))
            return cur.fetchall()

def build_rag_prompt(query, retrieved_chunks):
    """Construct a prompt for the LLM model using the query and retrieved context chunks."""

    today_date = date.today().isoformat() #date.today().strftime("%A, %B %d, %Y")
    context = "\n\n".join([f"- {text}" for text, _ in retrieved_chunks])
    memory_context = "\n".join([f"Q: {q}\nA: {a}" for q, a in conversation_history[-5:]])
    prompt = f"""
You are a precise assistant. Today is {today_date}. Use only the following context to answer the question.
The context may include individual assessments or units, bootcamp summaries, and attendance breakdowns.
Use only what is relevant. Always check whether the student has taken the unit or is enrolled in the bootcamp.
Do not mention the calculations you did in your final output.

Memory:
{memory_context}

Context:
{context}

Question:
{query}

Answer:"""
    return prompt

def call_llm(prompt):
    """Send the prompt to the LLM model and return its response."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

def rag_answer(query_text):
    """Retrieve top matching chunks, build the prompt, get the model's answer, and store the interaction in memory."""
    top_chunks = get_top_k_chunks(query_text, rag_table=RAG_TABLE, k=50)

    # Handle case where nothing is retrieved
    if not top_chunks:
        return [], "", "No relevant information was found in the knowledge base."
    prompt = build_rag_prompt(query_text, top_chunks)
    answer = call_llm(prompt)
    conversation_history.append((query_text, answer))
    return {"top_chunks": top_chunks, "answer": answer}

if __name__ == "__main__":
    q = "What is Salma Hasan's overall grade in Python Programming?"
    results = rag_answer(q)
    print("QUESTION:", q)
    print("\nANSWER:", results["answer"])
