# airflow home
export AIRFLOW_HOME=~/airflow

# install airflow
AIRFLOW_VERSION=2.10.4
PYTHON_VERSION=3.10
CONSTRAINT_URL="https://raw.githubusercontent.com/apache/airflow/constraints-${AIRFLOW_VERSION}/constraints-${PYTHON_VERSION}.txt"
pip install "apache-airflow==${AIRFLOW_VERSION}" --constraint "${CONSTRAINT_URL}"

# airflow code editor
pip install airflow-code-editor
pip install black isort

# add path
export PYTHONPATH=/Users/admin/git/xdp-scheduler:$PYTHONPATH

# start
airflow standalone