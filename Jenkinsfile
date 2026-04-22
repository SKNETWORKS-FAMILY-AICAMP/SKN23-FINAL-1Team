pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timestamps()
  }

  environment {
    DEPLOY_DIR = "/home/ubuntu/SKN23-FINAL-1team"
    COMPOSE_FILE = "docker-compose.prod.yml"
    DEPLOY_BRANCH = "develop"
  }

  stages {
    stage("Preflight") {
      steps {
        sh '''
          set -eu
          docker --version
          docker compose version
          git --version
          test -d "$DEPLOY_DIR"
        '''
      }
    }

    stage("Sync Source") {
      steps {
        sh '''
          set -eu
          cd "$DEPLOY_DIR"
          git fetch origin "$DEPLOY_BRANCH"
          git reset --hard "origin/$DEPLOY_BRANCH"
        '''
      }
    }

    stage("Check Env Files") {
      steps {
        sh '''
          set -eu
          cd "$DEPLOY_DIR"
          test -f backend/.env.production
          test -f frontend/.env.production
        '''
      }
    }

    stage("Deploy") {
      steps {
        sh '''
          set -eu
          cd "$DEPLOY_DIR"
          docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans
        '''
      }
    }

    stage("Health Check") {
      steps {
        sh '''
          set -eu
          cd "$DEPLOY_DIR"
          docker compose -f "$COMPOSE_FILE" ps

          for i in $(seq 1 30); do
            if curl -fsS http://127.0.0.1:3000 >/dev/null; then
              break
            fi
            if [ "$i" -eq 30 ]; then
              echo "Frontend health check failed"
              exit 1
            fi
            sleep 2
          done

          for i in $(seq 1 30); do
            if curl -fsS http://127.0.0.1:8000/docs >/dev/null; then
              break
            fi
            if [ "$i" -eq 30 ]; then
              echo "Backend health check failed"
              exit 1
            fi
            sleep 2
          done
        '''
      }
    }
  }

  post {
    failure {
      sh '''
        cd "$DEPLOY_DIR" || exit 0
        docker compose -f "$COMPOSE_FILE" logs --tail=100 frontend || true
        docker compose -f "$COMPOSE_FILE" logs --tail=100 backend || true
      '''
    }
  }
}
