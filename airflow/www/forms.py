#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
from __future__ import annotations

import datetime
import json
import operator
from typing import Iterator

import pendulum
from flask_appbuilder.fieldwidgets import (
    BS3PasswordFieldWidget,
    BS3TextAreaFieldWidget,
    BS3TextFieldWidget,
    Select2Widget,
)
from flask_appbuilder.forms import DynamicForm
from flask_babel import lazy_gettext
from flask_wtf import FlaskForm
from wtforms import widgets
from wtforms.fields import Field, IntegerField, PasswordField, SelectField, StringField, TextAreaField
from wtforms.validators import InputRequired, Optional

from airflow.compat.functools import cache
from airflow.configuration import conf
from airflow.providers_manager import ProvidersManager
from airflow.utils.types import DagRunType
from airflow.www.validators import ReadOnly, ValidConnID
from airflow.www.widgets import (
    AirflowDateTimePickerROWidget,
    AirflowDateTimePickerWidget,
    BS3TextAreaROWidget,
    BS3TextFieldROWidget,
)


class DateTimeWithTimezoneField(Field):
    """A text field which stores a `datetime.datetime` matching a format."""

    widget = widgets.TextInput()

    def __init__(self, label=None, validators=None, datetime_format="%Y-%m-%d %H:%M:%S%Z", **kwargs):
        super().__init__(label, validators, **kwargs)
        self.format = datetime_format
        self.data = None

    def _value(self):
        if self.raw_data:
            return " ".join(self.raw_data)
        if self.data:
            return self.data.strftime(self.format)
        return ""

    def process_formdata(self, valuelist):
        if not valuelist:
            return
        date_str = " ".join(valuelist)
        try:
            # Check if the datetime string is in the format without timezone, if so convert it to the
            # default timezone
            if len(date_str) == 19:
                parsed_datetime = datetime.datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                default_timezone = self._get_default_timezone()
                self.data = default_timezone.convert(parsed_datetime)
            else:
                self.data = pendulum.parse(date_str)
        except ValueError:
            self.data = None
            raise ValueError(self.gettext("Not a valid datetime value"))

    def _get_default_timezone(self):
        current_timezone = conf.get("core", "default_timezone")
        if current_timezone == "system":
            default_timezone = pendulum.local_timezone()
        else:
            default_timezone = pendulum.timezone(current_timezone)
        return default_timezone


class DateTimeForm(FlaskForm):
    """Date filter form needed for task views."""

    execution_date = DateTimeWithTimezoneField("Logical date", widget=AirflowDateTimePickerWidget())


class DagRunEditForm(DynamicForm):
    """
    Form for editing DAG Run.

    Only note field is editable, so everything else is read-only here.
    """

    dag_id = StringField(lazy_gettext("Dag Id"), validators=[ReadOnly()], widget=BS3TextFieldROWidget())
    start_date = DateTimeWithTimezoneField(
        lazy_gettext("Start Date"), validators=[ReadOnly()], widget=AirflowDateTimePickerROWidget()
    )
    end_date = DateTimeWithTimezoneField(
        lazy_gettext("End Date"), validators=[ReadOnly()], widget=AirflowDateTimePickerROWidget()
    )
    run_id = StringField(lazy_gettext("Run Id"), validators=[ReadOnly()], widget=BS3TextFieldROWidget())
    state = StringField(lazy_gettext("State"), validators=[ReadOnly()], widget=BS3TextFieldROWidget())
    execution_date = DateTimeWithTimezoneField(
        lazy_gettext("Logical Date"),
        validators=[ReadOnly()],
        widget=AirflowDateTimePickerROWidget(),
    )
    conf = TextAreaField(lazy_gettext("Conf"), validators=[ReadOnly()], widget=BS3TextAreaROWidget())
    note = TextAreaField(lazy_gettext("User Note"), widget=BS3TextAreaFieldWidget())

    def populate_obj(self, item):
        """Populate the attributes of the passed obj with data from the form's not-read-only fields."""
        for name, field in self._fields.items():
            if not field.flags.readonly:
                field.populate_obj(item, name)
        item.run_type = DagRunType.from_run_id(item.run_id)
        if item.conf:
            item.conf = json.loads(item.conf)


class TaskInstanceEditForm(DynamicForm):
    """
    Form for editing TaskInstance.

    Only note and state fields are editable, so everything else is read-only here.
    """

    dag_id = StringField(
        lazy_gettext("Dag Id"), validators=[InputRequired(), ReadOnly()], widget=BS3TextFieldROWidget()
    )
    task_id = StringField(
        lazy_gettext("Task Id"), validators=[InputRequired(), ReadOnly()], widget=BS3TextFieldROWidget()
    )
    start_date = DateTimeWithTimezoneField(
        lazy_gettext("Start Date"), validators=[ReadOnly()], widget=AirflowDateTimePickerROWidget()
    )
    end_date = DateTimeWithTimezoneField(
        lazy_gettext("End Date"), validators=[ReadOnly()], widget=AirflowDateTimePickerROWidget()
    )
    state = SelectField(
        lazy_gettext("State"),
        choices=(
            ("success", "success"),
            ("running", "running"),
            ("failed", "failed"),
            ("up_for_retry", "up_for_retry"),
        ),
        widget=Select2Widget(),
        validators=[InputRequired()],
    )
    execution_date = DateTimeWithTimezoneField(
        lazy_gettext("Logical Date"),
        widget=AirflowDateTimePickerROWidget(),
        validators=[InputRequired(), ReadOnly()],
    )
    note = TextAreaField(lazy_gettext("User Note"), widget=BS3TextAreaFieldWidget())

    def populate_obj(self, item):
        """Populate the attributes of the passed obj with data from the form's not-read-only fields."""
        for name, field in self._fields.items():
            if not field.flags.readonly:
                field.populate_obj(item, name)


@cache
def create_connection_form_class() -> type[DynamicForm]:
    """
    Create a form class for editing and adding Connection.

    This class is created dynamically because it relies heavily on run-time
    provider discovery, which slows down webserver startup a lot.
    By creating the class at runtime, we can delay loading the providers until
    when the connection form is first used, which may as well be never for a
    short-lived server.
    """
    providers_manager = ProvidersManager()

    def _iter_connection_types() -> Iterator[tuple[str, str]]:
        """List available connection types."""
        for connection_type, provider_info in providers_manager.hooks.items():
            if provider_info:
                yield (connection_type, provider_info.hook_name)

    class ConnectionForm(DynamicForm):
        def process(self, formdata=None, obj=None, **kwargs):
            super().process(formdata=formdata, obj=obj, **kwargs)
            for field in self._fields.values():
                if isinstance(getattr(field, "data", None), str):
                    field.data = field.data.strip()

        conn_id = StringField(
            lazy_gettext("连接ID"),
            validators=[InputRequired(), ValidConnID()],
            widget=BS3TextFieldWidget(),
        )
        conn_type = SelectField(
            lazy_gettext("连接类型"),
            choices=sorted(_iter_connection_types(), key=operator.itemgetter(1)),
            widget=Select2Widget(),
            validators=[InputRequired()],
            # description=(
            #     "Connection Type missing? Make sure you've installed the "
            #     "corresponding Airflow Provider Package."
            # ),
        )
        description = StringField(lazy_gettext("类型"), widget=BS3TextAreaFieldWidget())
        host = StringField(lazy_gettext("主机"), widget=BS3TextFieldWidget())
        schema = StringField(lazy_gettext("数据库模式"), widget=BS3TextFieldWidget())
        login = StringField(lazy_gettext("用户"), widget=BS3TextFieldWidget())
        password = PasswordField(lazy_gettext("密码"), widget=BS3PasswordFieldWidget())
        port = IntegerField(lazy_gettext("端口"), validators=[Optional()], widget=BS3TextFieldWidget())
        extra = TextAreaField(lazy_gettext("额外参数"), widget=BS3TextAreaFieldWidget())

    for key, value in providers_manager.connection_form_widgets.items():
        if value.field_name.lower() == "path":
            value.field.args = ("路径",)
        setattr(ConnectionForm, key, value.field)
    return ConnectionForm