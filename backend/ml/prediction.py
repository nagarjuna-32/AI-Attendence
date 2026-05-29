# Pure Python Heuristic Fallback for ML Predictions
# Replaces scikit-learn to bypass Windows Application Control DLL blocks.

def get_risk_prediction(attendance_percentage: float, consecutive_absences: int, late_count: int):
    """
    Returns (Risk_Level_String, Probability)
    Predicts attendance risk using a heuristic decision tree logic 
    (mimicking the behavior of a Random Forest).
    """
    
    # Base risk score calculation
    risk_score = 0.0
    
    # Factor 1: Overall Attendance Percentage
    if attendance_percentage < 65:
        risk_score += 0.6
    elif attendance_percentage < 75:
        risk_score += 0.3
    elif attendance_percentage < 85:
        risk_score += 0.1
        
    # Factor 2: Consecutive Absences
    if consecutive_absences >= 4:
        risk_score += 0.5
    elif consecutive_absences >= 2:
        risk_score += 0.2
        
    # Factor 3: Late Count
    if late_count >= 10:
        risk_score += 0.2
    elif late_count >= 5:
        risk_score += 0.1
        
    # Cap probability at 0.99
    probability = min(risk_score, 0.99)
    
    # Determine Class
    if risk_score >= 0.7:
        risk_level = "High"
    elif risk_score >= 0.4:
        risk_level = "Medium"
    else:
        risk_level = "Low"
        # Ensure minimum probability makes sense for 'Low'
        probability = max(probability, 0.05) 
        
    return risk_level, probability
