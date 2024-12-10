import hashlib
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from geopy.distance import geodesic

# Helper function: Generate composite hash for exact duplicates
def generate_composite_hash(entry):
    key_fields = [entry['field1'], entry['field2'], entry['timestamp'], str(entry['file_size'])]
    return hashlib.sha256("".join(key_fields).encode()).hexdigest()

# Helper function: Levenshtein distance for string similarity
def levenshtein_similarity(s1, s2):
    if len(s1) < len(s2):
        return levenshtein_similarity(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return 1 - (previous_row[-1] / max(len(s1), len(s2)))

# Helper function: TF-IDF and cosine similarity for text fields
def tfidf_cosine_similarity(text1, text2):
    vectorizer = TfidfVectorizer().fit_transform([text1, text2])
    vectors = vectorizer.toarray()
    return cosine_similarity(vectors)[0, 1]

# Helper function: Date similarity (assuming date format is consistent)
def date_diff_similarity(date1, date2):
    # Assuming the date format is comparable, the smaller the difference, the higher the similarity
    return 1 / (1 + abs((date1 - date2).days))

# Helper function: Geographical distance similarity for location-based data
def geo_distance_similarity(loc1, loc2):
    distance = geodesic(loc1, loc2).kilometers
    return 1 / (1 + distance)

# Helper function: Calculate composite similarity between two entries
def calculate_composite_similarity(entry1, entry2):
    name_similarity = levenshtein_similarity(entry1['name'], entry2['name']) * 0.4
    content_similarity = tfidf_cosine_similarity(entry1['content'], entry2['content']) * 0.3
    date_similarity = date_diff_similarity(entry1['date'], entry2['date']) * 0.2
    geo_similarity = geo_distance_similarity(entry1['location'], entry2['location']) * 0.1
    
    composite_score = name_similarity + content_similarity + date_similarity + geo_similarity
    return composite_score

# Helper function: Cluster similar entries based on composite similarity
def cluster_similar_entries(data):
    clusters = []
    for entry in data:
        similar_entries = []
        for candidate in data:
            if calculate_composite_similarity(entry, candidate) > 0.85:  # Threshold for similarity
                similar_entries.append(candidate)
        clusters.append(similar_entries)
    return clusters

# Helper function: Merge similar entries within clusters
def merge_entries(cluster):
    merged_entry = {}
    for field in cluster[0]:  # Merge by weighted priority
        if field == 'timestamp':
            merged_entry[field] = max([entry[field] for entry in cluster])
        elif field == 'size':
            merged_entry[field] = max([entry[field] for entry in cluster])
        else:
            merged_entry[field] = max(set([entry[field] for entry in cluster]), key=lambda x: cluster.count(x))
    return merged_entry

# Helper function: Detect anomalies using Isolation Forest
def detect_outliers(data):
    outliers = []
    # Use Isolation Forest for anomaly detection
    isolation_forest = IsolationForest()
    labels = isolation_forest.fit_predict([entry['numerical_features'] for entry in data])  # 'numerical_features' is a placeholder
    for i, label in enumerate(labels):
        if label == -1:
            outliers.append(data[i])
    return outliers

# Incremental deduplication to process data in batches
def incremental_deduplication(new_data, historical_data):
    lookup_table = generate_lookup(historical_data)  # Pre-generate hash lookup for existing data
    for entry in new_data:
        hash_val = generate_composite_hash(entry)
        if hash_val in lookup_table:
            # Duplicate found, merge and skip
            continue
        else:
            # New entry, add to historical data
            historical_data.append(entry)
    return historical_data

# Main deduplication function
def dedup_merge(data):
    lookup_table = {}  # For storing hashes and exact matches
    cleaned_data = []
    
    # Step 1: Exact Deduplication using Composite Hashing
    for entry in data:
        hash_val = generate_composite_hash(entry)
        if hash_val in lookup_table:
            continue  # Exact duplicate found, skip
        else:
            lookup_table[hash_val] = entry
            cleaned_data.append(entry)
    
    # Step 2: Anomaly Detection
    outliers = detect_outliers(cleaned_data)
    # Handle outliers separately (could apply different deduplication strategies)
    cleaned_data = [entry for entry in cleaned_data if entry not in outliers]
    
    # Step 3: Approximate Deduplication using Similarity Clustering
    clusters = cluster_similar_entries(cleaned_data)
    
    # Step 4: Merge clusters into clean data
    final_cleaned_data = []
    for cluster in clusters:
        merged_entry = merge_entries(cluster)
        final_cleaned_data.append(merged_entry)
    
    return final_cleaned_data
