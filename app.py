from flask import Flask, render_template, jsonify, request, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import random
import uuid
import sqlite3
import os

app = Flask(__name__)
app.secret_key = 'scrypt:32768:8:1$mNIj7TZDxxSA4eFv$ddee433e33b1ecb8f20d8c836eeeb1151b5596fdfd4ffba40e26549bbace115942b4f103a1c190144d0ba8b0723d069886c393de2b75434cee2cfff83f5ab0e2'

def init_db():
    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')
    conn.commit()
    conn.close()

games = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def send_js(path):
    return send_from_directory('static', path)

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Käyttäjänimi ja salasana vaaditaan!'}), 400

    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
        if cursor.fetchone():
            return jsonify({'error': 'Käyttäjänimi on jo käytössä!'}), 400

        hashed_password = generate_password_hash(password)
        cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, hashed_password))
        conn.commit()

        return jsonify({'message': 'Rekisteröinti onnistui!'}), 201
    finally:
        conn.close()

@app.route('/logout', methods=['POST'])
def logout():
    if 'user_id' not in session:
        return jsonify({'error': 'Et ole kirjautunut sisään!'}), 400

    session.pop('user_id', None)  
    return jsonify({'message': 'Kirjauduit ulos!'}), 200

@app.route('/login', methods=['POST'])
def login():
    if session.get('processing_login') == True:
        return jsonify({'error': 'Pyyntö käsitellään jo!'}), 429

    session['processing_login'] = True  
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        session['processing_login'] = False  
        return jsonify({'error': 'Käyttäjänimi ja salasana vaaditaan!'}), 400

    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT id, password FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()

        if user and check_password_hash(user[1], password):
            session['user_id'] = user[0]  

            cursor.execute('SELECT MAX(score) FROM scores WHERE user_id = ?', (user[0],))
            high_score = cursor.fetchone()[0] or 0

            session['processing_login'] = False  
            return jsonify({'message': 'Kirjautuminen onnistui!', 'high_score': high_score}), 200
        else:
            session['processing_login'] = False  
            return jsonify({'error': 'Virheellinen käyttäjänimi tai salasana!'}), 400
    except Exception as e:
        session['processing_login'] = False  
        print(f"Virhe kirjautumisessa: {e}")
        return jsonify({'error': 'Jotain meni pieleen!'}), 500
    finally:
        conn.close()  
        session['processing_login'] = False  

@app.route('/change_password', methods=['POST'])
def change_password():
    data = request.json
    username = data.get('username')
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not username or not current_password or not new_password:
        return jsonify({'error': 'Käyttäjänimi, nykyinen salasana ja uusi salasana vaaditaan!'}), 400

    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()

    try:

        cursor.execute('SELECT password FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()

        if not user:
            return jsonify({'error': 'Käyttäjää ei löydy!'}), 400


        if not check_password_hash(user[0], current_password):
            return jsonify({'error': 'Nykyinen salasana on väärä!'}), 400

        if current_password == new_password:
            return jsonify({'error': 'Uusi salasana ei voi olla sama kuin nykyinen salasana!'}), 400


        hashed_new_password = generate_password_hash(new_password)
        cursor.execute('UPDATE users SET password = ? WHERE username = ?', (hashed_new_password, username))
        conn.commit()
        return jsonify({'message': 'Salasana vaihdettu onnistuneesti!'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Tietokantavirhe: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/delete_user', methods=['POST'])
def delete_user():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    confirm_password = data.get('confirm_password')

    if not username or not password or not confirm_password:
        return jsonify({'error': 'Käyttäjänimi, salasana ja vahvistus vaaditaan!'}), 400

    if password != confirm_password:
        return jsonify({'error': 'Salasanat eivät täsmää!'}), 400

    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT password FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()

        if not user or not check_password_hash(user[0], password):
            return jsonify({'error': 'Virheellinen salasana!'}), 400

        cursor.execute('DELETE FROM users WHERE username = ?', (username,))
        cursor.execute('DELETE FROM scores WHERE user_id = (SELECT id FROM users WHERE username = ?)', (username,))
        conn.commit()
        return jsonify({'message': 'Käyttäjä poistettu onnistuneesti!'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Tietokantavirhe: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/create_board', methods=['POST'])
def create_board():
    data = request.json
    print(f"Saapuva data: {data}")  
    size = data.get('size')
    mines = data.get('mines')

    if not size or not mines:
        return jsonify({'error': 'Laudan koko tai miinojen määrä puuttuu!'}), 400

    if size <= 0 or mines <= 0:
        return jsonify({'error': 'Laudan koon ja miinojen määrän täytyy olla positiivisia!'}), 400

    if mines >= size * size:
        return jsonify({'error': 'Liikaa miinoja suhteessa laudan kokoon!'}), 400

    try:
        board = [[' ' for _ in range(size)] for _ in range(size)]
        mine_positions = random.sample(range(size * size), mines)

        for pos in mine_positions:
            row, col = divmod(pos, size)
            board[row][col] = '*'

        print(f"Luotu pelilauta: {board}")  
        return jsonify({'board': board, 'size': size, 'mines': mines}), 200
    except Exception as e:
        print(f"Virhe laudan luomisessa: {e}") 
        return jsonify({'error': f'Virhe pelilaudan luomisessa: {str(e)}'}), 500

@app.route('/update_score', methods=['POST'])
def update_score():
    data = request.json
    user_id = session.get('user_id')
    score = data.get('score')

    if not user_id:
        return jsonify({'error': 'Et ole kirjautunut sisään!'}), 400

    if not isinstance(score, int):
        return jsonify({'error': 'Pistemäärä täytyy olla kokonaisluku!'}), 400

    conn = sqlite3.connect('game.db')
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT MAX(score) FROM scores WHERE user_id = ?', (user_id,))
        current_high_score = cursor.fetchone()[0] or 0

        if score > current_high_score:
            cursor.execute('INSERT INTO scores (user_id, score) VALUES (?, ?)', (user_id, score))
            conn.commit()

        return jsonify({'message': 'High Score päivitetty tietokantaan!', 'current_high_score': current_high_score, 'new_score': score}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Virhe tietokantakäsittelyssä: {str(e)}'}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)