# 사건뭉치
- 세무 판례 검색으로 매일 고통받는 💩을 위해 생성형AI를 활용한 판례 검색기를 만듭니다.

### 작업 프로세스
- [X] 0. 10년치 판례 데이터를 수집합니다. (법제처 API 특성상 수집은 수동으로 진행합니다.)
- [X] 1. 세무 판례의 "판결요지"를 중심으로 판례 결론과 관련있는 부분만 벡터 데이터베이스에 저장합니다.
- [X] 2. 사용자가 질문을 입력했을 때, 벡터데이터베이스를 통해 판례를 검색하도록 검색 파이프라인을 생성합니다.
- [ ] 3. 검색 Backend를 만듭니다.
- [ ] 4. 사용자 계정 관리와 접근 가능한 UI를 만듭니다.

### 아키텍처
<p align="center">
  <img src="./doc/architecture/architecture_v0.1.png">
</p>

# 개발 환경

## CDK
```
$ node -v
$ npm -v
$ npm install # 의존성 설치

$ aws --version
$ aws configure # aws credential로 profile 설정
```
```
$ cdk bootstrap --profile [YOUR AWS PROFILE] # 해당 account에서 첫 cdk 실행일 때
$ cdk synth
$ cdk deploy --profile [YOUR AWS PROFILE] # cdk 배포
$ cdk destroy --profile [YOUR AWS PROFILE] # cdk 회수
```
### ‼️ 첫 배포 시 주의사항 ‼️
- CDK는 비동기로 배포됩니다. 
- 따라서, ApiStack이 생성되지 않은 상태에서 ViewStack이 ApiStack의 URL을 참고하려고 하면 view에서 api를 실행할 수 없습니다.
- 그러므로 첫 배포 시에는 `cdk.ts`의 `new EcsViewStack(...)`를 주석처리하고 먼저 배포하세요.
- 그리고 `view/lib/main.dart`의 `EcsApiStack`의 배포 결과 loadbalancerDnsName으로 url을 변경해주세요.
- 주석을 해제하고 한 번 더 배포해 `EcsViewStack`을 배포하세요.
- 이렇게 두 번째 배포에서 flutter가 api url을 참고할 수 있게 됩니다.

## Python
```
$ pip install pipenv
$ pipenv install # 의존성 설치
$ pipenv shell # 가상환경 실행
```

## Flutter
```
$ flutter pub get # 의존성 설치
```

## pre-commit
- 자동화된 코드 품질 보장을 위해 pre-commit 적용
```
$ pre-commit install # 프로젝트 첫 셋팅 시 실행
$ pre-commit run --all-files
```
- 개별 적용
```
$ npm run lint
$ npm run test

$ black .
$ cd api && pytest . && cd ..
$ cd processing && pytest . && cd ..
```

## 로컬 실행
```
$ cd api && uvicorn main:app --host 0.0.0.0 --port 80
$ cd view && flutter run
```
- flutter setup은 [여기](https://docs.flutter.dev/get-started/install)를 참고
