from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Example weights and threshold for the algorithm
WEIGHTS = {
    'size': 0.4,
    'timestamp': 0.3,
    'filename_length': 0.2,
    'metadata': 0.1  # Optional if using metadata
}
THRESHOLD = 0.8  # 80% similarity threshold for deduplication

# Uniqueness score calculation
def calculate_uniqueness_score(file, weights):
    size = file['size']
    timestamp = datetime.fromisoformat(file['timestamp'].replace('Z', '+00:00')).timestamp()
    filename_length = len(file['name'])
    metadata_score = file.get('metadata_score', 1)

    normalized_size = size / 1000000  # Assuming max file size is 1MB
    normalized_timestamp = timestamp / 1000000000  # Normalize timestamp
    normalized_filename_length = filename_length / 255  # Assuming max filename length is 255

    score = (
        (normalized_size * weights['size']) +
        (normalized_timestamp * weights['timestamp']) +
        (normalized_filename_length * weights['filename_length']) +
        (metadata_score * weights['metadata'])
    )
    return score

# File comparison to calculate similarity
def compare_files(file1, file2, weights):
    score1 = calculate_uniqueness_score(file1, weights)
    score2 = calculate_uniqueness_score(file2, weights)
    similarity = 1 - abs(score1 - score2)
    return similarity

# Deduplication algorithm using weighted scores
def deduplicate_files(files, weights, threshold):
    scored_files = []
    for file in files:
        score = calculate_uniqueness_score(file, weights)
        scored_files.append((file, score))

    scored_files.sort(key=lambda x: x[1], reverse=True)
    deduplicated = []

    for file, score in scored_files:
        similar = False
        for dedup_file, _ in deduplicated:
            similarity = compare_files(file, dedup_file, weights)
            if similarity > threshold:
                similar = True
                break
        if not similar:
            deduplicated.append((file, score))

    return [f[0] for f in deduplicated]

# API route to deduplicate
@app.route('/api/deduplicate', methods=['POST'])
def deduplicate():
    datasets = request.get_json()
    deduplicated_files = deduplicate_files(datasets, WEIGHTS, THRESHOLD)
    return jsonify(deduplicated_files)

if __name__ == '__main__':
    app.run(debug=True)
