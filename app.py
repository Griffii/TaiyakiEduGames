from flask import Flask, render_template, send_from_directory, abort
import os
import webbrowser
import threading

app = Flask(__name__)

# Define paths
BASE_DIR = os.getcwd()
GAMES_DIR = os.path.join(BASE_DIR, 'games')
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')

@app.route('/')
def home():
    """List available games dynamically."""
    games = [g for g in os.listdir(GAMES_DIR) if os.path.isdir(os.path.join(GAMES_DIR, g))]
    return render_template('index.html', games=games)

@app.route('/game/<game_name>/')
def game(game_name):
    """Serve the index.html file for the selected game."""
    game_path = os.path.join(GAMES_DIR, game_name, 'index.html')
    if os.path.exists(game_path):
        return send_from_directory(os.path.join(GAMES_DIR, game_name), 'index.html')
    return abort(404)

@app.route('/game/<game_name>/<path:filename>')
def game_files(game_name, filename):
    """Serve game-specific files (CSS, JS, images, etc.)."""
    game_folder = os.path.join(GAMES_DIR, game_name)
    file_path = os.path.join(game_folder, filename)
    if os.path.exists(file_path):
        return send_from_directory(game_folder, filename)
    return abort(404)

@app.route('/assets/<path:filename>')
def shared_assets(filename):
    """Serve shared assets like sounds and images."""
    file_path = os.path.join(ASSETS_DIR, filename)
    if os.path.exists(file_path):
        return send_from_directory(ASSETS_DIR, filename)
    return abort(404)

@app.route('/static/<filename>')
def serve_static(filename):
    """Serve static files like the app icon."""
    return send_from_directory(BASE_DIR, filename)

if __name__ == '__main__':
    app.run(debug=True)


def open_browser():
    """Opens the default web browser to the Flask app."""
    webbrowser.open("http://127.0.0.1:5000/")

if __name__ == "__main__":
    threading.Timer(1.25, open_browser).start()  # Delay browser opening slightly
    app.run(host="127.0.0.1", port=5000)
