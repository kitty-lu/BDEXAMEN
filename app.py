from flask import Flask, render_template, jsonify
from pymongo import MongoClient
from sqlalchemy import create_engine
import pandas as pd

app = Flask(__name__)

# Configuración de conexiones
MONGO_URI = "mongodb+srv://kitty_lu:TIGRITO11@cluster0.upoiay2.mongodb.net/BDEXAMEN?retryWrites=true&w=majority&appName=Cluster0"
POSTGRES_URI = "postgresql://postgres:12345@localhost:5432/BDEXAMEN"

# Conexiones establecidas al inicio
mongo_client = MongoClient(MONGO_URI)
engine = create_engine(POSTGRES_URI)

@app.route('/')
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/estudiantes-por-carrera')
def estudiantes_por_carrera():
    query = "SELECT carrera, COUNT(*) as cantidad FROM estudiantes GROUP BY carrera"
    df = pd.read_sql(query, engine)
    return jsonify(df.to_dict('records'))

@app.route('/api/promedio-nota-curso')
def promedio_nota_curso():
    query = """
    SELECT c.nombre as curso, AVG(i.nota) as promedio
    FROM inscripcion i JOIN curso c ON i.id_curso = c.id_curso
    GROUP BY c.nombre ORDER BY promedio DESC
    """
    df = pd.read_sql(query, engine)
    return jsonify(df.to_dict('records'))

@app.route('/api/top-estudiantes')
def top_estudiantes():
    query = """
    SELECT e.nombre, e.carrera, MAX(i.nota) as mejor_nota, c.nombre as curso
    FROM estudiantes e
    JOIN inscripcion i ON e.id_estudiante = i.id_estudiante
    JOIN curso c ON i.id_curso = c.id_curso
    GROUP BY e.nombre, e.carrera, c.nombre
    ORDER BY mejor_nota DESC
    LIMIT 3
    """
    df = pd.read_sql(query, engine)
    return jsonify(df.to_dict('records'))

@app.route('/api/todos-datos')
def todos_datos():
    query = """
    SELECT e.nombre as estudiantes, e.carrera, c.nombre as curso, 
           p.nombre as profesor, i.nota, c.semestre
    FROM estudiantes e
    JOIN inscripcion i ON e.id_estudiante = i.id_estudiante
    JOIN curso c ON i.id_curso = c.id_curso
    JOIN profesor p ON c.id_profesor = p.id_profesor
    ORDER BY i.nota DESC
    """
    df = pd.read_sql(query, engine)
    return jsonify(df.to_dict('records'))

@app.route('/api/distribucion-semestres')
def distribucion_semestres():
    db = mongo_client.BDEXAMEN
    pipeline = [{"$group": {"_id": "$semestre", "count": {"$sum": 1}}}]
    result = list(db.curso.aggregate(pipeline))
    return jsonify(result)

@app.route('/api/rendimiento-curso')
def rendimiento_cursos():
    db = mongo_client.BDEXAMEN
    pipeline = [
        {"$lookup": {
            "from": "inscripcion",
            "localField": "_id",
            "foreignField": "id_curso", 
            "as": "inscripcion"
        }},
        {"$unwind": "$inscripcion"},
        {"$group": {
            "_id": "$nombre",
            "promedio": {"$avg": "$inscripcion.nota"},
            "aprobados": {
                "$sum": {"$cond": [{"$gte": ["$inscripcion.nota", 60]}, 1, 0]}
            },
            "total": {"$sum": 1}
        }},
        {"$project": {
            "curso": "$_id",
            "tasa_aprobacion": {"$multiply": [{"$divide": ["$aprobados", "$total"]}, 100]},
            "promedio_nota": "$promedio"
        }},
        {"$sort": {"promedio_nota": -1}}
    ]
    result = list(db.curso.aggregate(pipeline))
    return jsonify(result)

@app.route('/api/profesor-curso')
def profesor_cursos():
    db = mongo_client.BDEXAMEN
    pipeline = [
        {"$lookup": {
            "from": "profesor",
            "localField": "id_profesor",
            "foreignField": "_id",
            "as": "profesor"
        }},
        {"$unwind": "$profesor"},
        {"$group": {
            "_id": "$profesor.nombre",
            "total_cursos": {"$sum": 1},
            "promedio_semestre": {"$avg": "$semestre"}
        }},
        {"$sort": {"total_cursos": -1}}
    ]
    result = list(db.curso.aggregate(pipeline))
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)