#!/bin/bash

# 初始化目录
mkdir -p /opt/airflow/dags /opt/airflow/logs /opt/airflow/plugins

# 初始化数据库
airflow db init

# 创建管理员用户（如果不存在）
if [[ -z "$(airflow users list | grep admin)" ]]; then
  airflow users create \
    --username admin \
    --password admin \
    --firstname Admin \
    --lastname User \
    --role Admin \
    --email admin@example.com
fi

# 根据命令行参数执行相应的命令
case "$1" in
  webserver)
    exec airflow webserver
    ;;
  scheduler)
    exec airflow scheduler
    ;;
  worker)
    exec airflow celery worker
    ;;
  flower)
    exec airflow celery flower
    ;;
  triggerer)
    exec airflow triggerer
    ;;
  *)
    # 默认执行传入的命令
    exec "$@"
    ;;
esac