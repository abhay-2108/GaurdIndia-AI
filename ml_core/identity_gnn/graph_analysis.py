import networkx as nx

def calculate_identity_similarity(db_edges, new_pan: str, new_phone: str) -> float:
    """
    Builds a NetworkX graph from database edges and calculates the Jaccard 
    Similarity Coefficient between a new PAN card and phone number.
    If a direct edge exists, it returns the historical weight of that connection.
    
    Args:
        db_edges: SQLAlchemy identity graph edge models.
        new_pan (str): PAN string to audit.
        new_phone (str): Phone string to audit.
        
    Returns:
        float: Jaccard Similarity Coefficient or connection weight (0.0 to 1.0).
    """
    G = nx.Graph()
    
    # Load historical database edges into the NetworkX Graph
    for edge in db_edges:
        G.add_edge(edge.source_node, edge.target_node, weight=edge.historical_weight)
        
    pan_node = f"PAN:{new_pan.strip().upper()}"
    phone_node = f"PHONE:{new_phone.strip()}"
    
    # If there is a direct historical edge, return its weight
    if G.has_edge(pan_node, phone_node):
        return float(G[pan_node][phone_node].get('weight', 0.0))
        
    # If nodes don't exist in historical registry yet, similarity is 0.0 (clean new applicant)
    if not G.has_node(pan_node) or not G.has_node(phone_node):
        return 0.0
    
    # Calculate Jaccard coefficient of their neighbor sets (e.g. shared WebGL device hashes)
    preds = nx.jaccard_coefficient(G, [(pan_node, phone_node)])
    for u, v, jaccard_index in preds:
        return float(jaccard_index)
        
    return 0.0

def find_linked_node_count(db_edges, node_prefix: str, identifier: str) -> int:
    """
    Counts how many unique nodes are directly linked to this identifier node in the database graph.
    Useful for counting how many different phone numbers/WebGL hashes are bound to a single PAN.
    """
    G = nx.Graph()
    for edge in db_edges:
        G.add_edge(edge.source_node, edge.target_node)
        
    target_node = f"{node_prefix}:{identifier.strip()}"
    if not G.has_node(target_node):
        return 0
        
    return len(list(G.neighbors(target_node)))
