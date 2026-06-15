# itmovito

## Развёртывание

### 1. Установите Terraform

Установите [Terraform](https://developer.hashicorp.com/terraform/install) версии `>= 1.11`.

### 2. Настройте провайдер MWS для Terraform

Создайте файл `~/.terraformrc`:

```bash
touch ~/.terraformrc
```

Добавьте в `~/.terraformrc` следующий блок:

```hcl
provider_installation {
  network_mirror {
    url = "https://storage.mwsapis.ru/mws-terraform/",
    include = ["registry.terraform.io/mws-cloud/*"]
  }

  direct {
    exclude = ["registry.terraform.io/mws-cloud/*"]
  }
}
```

Подробнее — в [быстром старте Terraform для MWS Cloud Platform](https://mws.ru/docs/cloud-platform/terraform/general/terraform-quickstart.html).

### 3. Получите аутентификационные данные

1. Создайте сервисный аккаунт в MWS Cloud Platform и назначьте ему роль `editor` или выше на проект.
2. Создайте авторизованный ключ для сервисного аккаунта и скачайте файл с ключом.
3. Сохраните ключ в файл `./infra/keys/service-account-key.txt` (директория `keys` уже добавлена в `.gitignore` — не коммитьте ключ в репозиторий).

Инструкция по созданию ключа — в разделе «Получите аутентификационные данные» [документации MWS](https://mws.ru/docs/cloud-platform/terraform/general/terraform-quickstart.html).

Параметры проекта задаются в `infra/terraform.tfvars`:

```hcl
sa_key_path  = "./keys/service-account-key.txt"
project      = "itmovito"
network_name = "mynetwork"
subnet_name  = "mysubnet"
subnet_cidr  = "192.168.0.0/16"
```

При необходимости отредактируйте `project` и другие переменные под свой проект.

### 4. Создайте инфраструктуру

```bash
cd infra
terraform init
terraform plan
terraform apply
```

Terraform создаст VPC, Managed Kubernetes кластер `itmovito-mk8s`, node group и правила firewall (в том числе доступ к frontend на порту `30080`).

Чтобы удалить инфраструктуру:

```bash
cd infra
terraform destroy
```

### 5. Настройте kubectl

1. Установите и настройте MWS CLI (инициализируйте профиль с тем же сервисным аккаунтом).
2. Установите [kubectl](https://kubernetes.io/docs/tasks/tools/).
3. Получите kubeconfig для кластера через публичный эндпоинт:

```bash
mws mk8s get-kubeconfig itmovito-mk8s --public-endpoint
```

Конфигурация сохранится в `$HOME/.kube/config`. Подробнее — в [документации по подключению к кластеру](https://mws.ru/docs/cloud-platform/mk8s/general/cluster-connect.html).

4. Проверьте доступ:

```bash
kubectl cluster-info
kubectl get nodes
```

### 6. Опубликуйте Docker-образы

Образы backend и frontend пушатся в MWS Registry при merge в ветку `master` (job `publish-images` в CI).

Либо соберите и запушьте вручную:

```bash
echo "$MWS_REGISTRY_API_KEY" | docker login -u apikey --password-stdin registry.mwsapis.ru

docker build -t registry.mwsapis.ru/itmovito/itmovito-registry/backend:latest ./backend
docker push registry.mwsapis.ru/itmovito/itmovito-registry/backend:latest

docker build -t registry.mwsapis.ru/itmovito/itmovito-registry/frontend:latest ./frontend
docker push registry.mwsapis.ru/itmovito/itmovito-registry/frontend:latest
```

Если registry приватный, создайте `imagePullSecret` в namespace `itmovito` и добавьте его в Deployment'ы.

### 7. Разверните сервисы в Kubernetes

Перед деплоем проверьте `k8s/backend-env.yaml` — в `CORS_ORIGINS` должен быть URL, с которого открываете frontend.

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend-env.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

Дождитесь готовности подов:

```bash
kubectl -n itmovito rollout status deployment/db
kubectl -n itmovito rollout status deployment/backend
kubectl -n itmovito rollout status deployment/frontend
kubectl -n itmovito get pods,svc
```

Frontend доступен через Service типа `LoadBalancer` на порту `30080`:

```bash
kubectl -n itmovito get svc frontend
```

Откройте `http://<EXTERNAL-IP>:30080`.

Backend при старте ждёт PostgreSQL, выполняет миграции Prisma и seed.

### GitOps через ArgoCD

ArgoCD автоматически деплоит приложение из Git (ветка `master`, папка `k8s/`).

**1. Установка ArgoCD** (namespace создаётся автоматически):

```bash
kubectl apply -k k8s/argocd
kubectl -n argocd rollout status deployment/argocd-server
```

**2. Доступ к UI.** `argocd-server` опубликован через `LoadBalancer` (`k8s/argocd/server-lb.yaml`), порт `30443` открыт в firewall (Terraform). Внешний IP:

```bash
kubectl -n argocd get svc argocd-server-lb
```

Открой `https://<EXTERNAL-IP>` (LB слушает `443`; через NodePort — `https://<IP-ноды>:30443`). Логин `admin`, пароль:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d; echo
```

**3. Подключить приложение.** Один раз применяешь Application — ArgoCD начнёт следить за `k8s/` в GitHub:

```bash
kubectl apply -f k8s/argocd/itmovito.yaml
```

После `git push` в `master` изменения в `k8s/` автоматически попадут в кластер (`prune` + `selfHeal` включены).

В UI ArgoCD появится одно приложение — `itmovito` (namespace, postgres, backend, frontend из `k8s/kustomization.yaml`).

> Файлы должны быть в GitHub — ArgoCD читает репозиторий, а не локальные файлы. Закоммить и запушь `k8s/kustomization.yaml` и `k8s/argocd/` перед первым запуском.

### Локальный запуск в Kubernetes

Для minikube, kind или Docker Desktop:

```bash
docker build -t itmovito/backend:local ./backend
docker build -t itmovito/frontend:local ./frontend

# kind
kind load docker-image itmovito/backend:local itmovito/frontend:local

# minikube
minikube image load itmovito/backend:local
minikube image load itmovito/frontend:local

kubectl apply -k k8s/local
```

### Локальный запуск через Docker Compose

```bash
docker compose up --build
```

Приложение будет доступно на `http://localhost:3030`, API — на `http://localhost:3000`.
