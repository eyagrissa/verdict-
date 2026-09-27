import gradio as gr
import os
from groq import Groq
from google import genai

groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])
gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

def comparer(question):
    reponse_groq = groq_client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "user", "content": question}]
    ).choices[0].message.content

    reponse_gemini = gemini_client.models.generate_content(
        model="gemini-3.8-flash",
        contents=question
    ).text

    return reponse_groq, reponse_gemini

demo = gr.Interface(
    fn=comparer,
    inputs=gr.Textbox(label="Pose ta question"),
    outputs=[
        gr.Textbox(label="Réponse Groq"),
        gr.Textbox(label="Réponse Gemini")
    ],
    title="Verdict - Comparateur IA"
)

demo.launch()
