import mysql.connector

def get_db_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Cherry$2004",
        database="attendance_system"
    )

    return connection