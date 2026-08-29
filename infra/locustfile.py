"""Smoke load: pip install locust && locust -f infra/locustfile.py --headless -u 20 -r 5 -t 30s --host http://localhost"""

from locust import HttpUser, between, task


class StorefrontUser(HttpUser):
    wait_time = between(0.5, 2)

    @task(5)
    def health(self):
        self.client.get("/health")

    @task(3)
    def catalog(self):
        self.client.get("/api/v1/products?page_size=12")

    @task(1)
    def ready(self):
        self.client.get("/health/ready")
