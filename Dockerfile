FROM python:3.10-slim-bullseye

LABEL maintainer="Airflow Maintainer <your-email@example.com>"

# 防止 Python 生成 .pyc 文件和使用 __pycache__ 目录
ENV PYTHONDONTWRITEBYTECODE 1
# 确保 Python 输出直接发送到终端而不是缓冲
ENV PYTHONUNBUFFERED 1
# 设置 Airflow 主目录
ENV AIRFLOW_HOME=/opt/airflow
ENV AIRFLOW_VERSION=2.10.4
ENV PYTHON_VERSION=3.10
ENV CONSTRAINT_URL="https://raw.githubusercontent.com/apache/airflow/constraints-${AIRFLOW_VERSION}/constraints-${PYTHON_VERSION}.txt"

# 配置国内 Debian 镜像源
RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list \
    && sed -i 's/security.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list

# 安装系统依赖
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        default-libmysqlclient-dev \
        freetds-bin \
        freetds-dev \
        git \
        libffi-dev \
        libkrb5-dev \
        libpq-dev \
        libsasl2-dev \
        libssl-dev \
        netcat-openbsd \
        rsync \
        wget \
        pkg-config \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 创建 airflow 用户
RUN useradd -ms /bin/bash -d ${AIRFLOW_HOME} airflow

# 切换到 airflow 用户主目录
WORKDIR ${AIRFLOW_HOME}

# 复制 entrypoint 脚本
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 配置国内 pip 镜像源
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 先单独安装 psycopg2-binary
RUN pip install --no-cache-dir psycopg2

# 安装 Airflow 及其依赖
RUN pip install --no-cache-dir "apache-airflow==${AIRFLOW_VERSION}" --constraint "${CONSTRAINT_URL}" \
    && pip install --no-cache-dir "apache-airflow[postgres,mysql,ssh]==${AIRFLOW_VERSION}" --constraint "${CONSTRAINT_URL}"

# 创建必要的目录
RUN mkdir -p ${AIRFLOW_HOME}/dags ${AIRFLOW_HOME}/logs ${AIRFLOW_HOME}/plugins ${AIRFLOW_HOME}/config \
    && chown -R airflow:airflow ${AIRFLOW_HOME}
COPY airflow ${AIRFLOW_HOME}/airflow
# 切换到 airflow 用户
USER airflow

# 设置 PYTHONPATH
ENV PYTHONPATH=${AIRFLOW_HOME}:${PYTHONPATH}

# 暴露 Airflow Web UI 端口
EXPOSE 8080

# 设置 entrypoint
ENTRYPOINT ["/entrypoint.sh"]
CMD ["webserver"]