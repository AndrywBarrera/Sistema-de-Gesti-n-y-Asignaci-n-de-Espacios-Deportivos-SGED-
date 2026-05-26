pipeline_roles = [
    {
        "$group": {
            "_id": "$rol",
            "cantidad": {"$sum": 1}
        }
    }
]