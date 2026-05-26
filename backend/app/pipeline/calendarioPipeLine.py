def generar_pipeline_calendario(reserva, fecha):
    pipeline = [
        {
            "$set": {
                "fecha": fecha,
                f'espacios.{reserva["espacioId"]}': {
                    "$sortArray": {
                        "input": {
                            "$setUnion": [
                                {
                                    "$ifNull": [
                                        f"$espacios.{reserva['espacioId']}",
                                        []
                                    ]
                                },
                                reserva["horarios_elegidos"]
                            ]
                        },
                        "sortBy": 1
                    }
                }
            }
        }
    ]
    
    return pipeline