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
          curl -fsS http://127.0.0.1:3000 >/dev/null
          curl -fsS http://127.0.0.1:8000/docs >/dev/null
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
