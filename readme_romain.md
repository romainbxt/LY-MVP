# Activer le Chatbot LY

## 1. Obtenir une clé API Gemini (gratuit)

1. Va sur https://aistudio.google.com/apikey
2. Connecte-toi avec ton compte Google
3. Clique sur **"Create API Key"**
4. Copie la clé générée

## 2. Ajouter la clé sur Railway

1. Va sur ton dashboard Railway
2. Ouvre le projet LY
3. Va dans **Variables**
4. Ajoute une nouvelle variable :
   - **Name :** `GEMINI_API_KEY`
   - **Value :** ta clé API copiée à l'étape 1
5. Railway va automatiquement redéployer l'app

## 3. C'est tout !

Le chatbot apparaît automatiquement en bas à droite sur toutes les pages (bouton violet).

Il s'adapte au type d'utilisateur :
- **Visiteur** : explique ce qu'est LY, les tarifs, comment s'inscrire
- **Commerçant connecté** : aide avec le dashboard, scan, récompenses, churn, WhatsApp
- **Client** : aide avec la carte de fidélité, les visites, les paliers

## En local (pour tester)

```bash
pip install google-genai
set GEMINI_API_KEY=ta-cle-api
python app.py
```
