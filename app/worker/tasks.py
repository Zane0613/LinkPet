from app.worker.celery_app import celery_app

@celery_app.task
def generate_trip_diary(trip_id):
    # TODO: Implement diary generation task
    pass

@celery_app.task
def generate_image(trip_id):
    # TODO: Implement image generation task
    pass
