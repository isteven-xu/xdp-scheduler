/*!
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
/**
 * Created by janomar on 23/07/15.
 */

/* global document, DOMParser, $, CodeMirror */
import { getMetaValue } from "./utils";

const configTestConnection = getMetaValue("config_test_connection")
  .toLowerCase()
  .trim();
const restApiEnabled = getMetaValue("rest_api_enabled") === "True";
const connectionTestUrl = getMetaValue("test_url");

// Define editor var which may get populated if extra field exists on the connection
let editor;

function decode(str) {
  return new DOMParser().parseFromString(str, "text/html").documentElement
    .textContent;
}

/**
 * Returns a map of connection type to its controls.
 */
function getConnTypesToControlsMap() {
  const connTypesToControlsMap = new Map();

  const extraFormControls = Array.from(
    document.querySelectorAll("[id^='extra__'")
  );
  extraFormControls.forEach((control) => {
    const connTypeEnd = control.id.indexOf("__", "extra__".length);
    const connType = control.id.substring("extra__".length, connTypeEnd);

    const controls = connTypesToControlsMap.has(connType)
      ? connTypesToControlsMap.get(connType)
      : [];

    controls.push(control.parentElement.parentElement);
    connTypesToControlsMap.set(connType, controls);
  });

  return connTypesToControlsMap;
}

/**
 * Returns the DOM element that contains the different controls.
 */
function getControlsContainer() {
  return document.getElementById("conn_id").parentElement.parentElement
    .parentElement;
}

/**
 * Restores the behaviour for all fields. Used to restore fields to a
 * well-known state during the change of connection types.
 */
function restoreFieldBehaviours() {
  Array.from(document.querySelectorAll("label[data-orig-text]")).forEach(
    (elem) => {
      // eslint-disable-next-line no-param-reassign
      elem.innerText = elem.dataset.origText;
      // eslint-disable-next-line no-param-reassign
      delete elem.dataset.origText;
    }
  );

  Array.from(document.querySelectorAll(".form-control")).forEach((elem) => {
    // eslint-disable-next-line no-param-reassign
    elem.placeholder = "";
    elem.parentElement.parentElement.classList.remove("hide");
  });
}

/**
 * Applies special behaviour for fields. The behaviour is defined through
 * config, passed by the server.
 *
 * @param {string} connection The connection object to apply to.
 */
function applyFieldBehaviours(connection) {
  if (connection) {
    if (Array.isArray(connection.hidden_fields)) {
      connection.hidden_fields.forEach((field) => {
        document
          .getElementById(field)
          .parentElement.parentElement.classList.add("hide");
      });
    }

    if (connection.relabeling) {
      Object.keys(connection.relabeling).forEach((field) => {
        const label = document.querySelector(`label[for='${field}']`);
        label.dataset.origText = label.innerText;
        label.innerText = connection.relabeling[field];

      });
    }

    if (connection.placeholders) {
      Object.keys(connection.placeholders).forEach((field) => {
        const placeholder = connection.placeholders[field];
        document.getElementById(field).placeholder = placeholder;
      });
    }
  }
}

/**
 * Dynamically enable/disable the Test Connection button as determined by the selected
 * connection type.
 @param {string} connectionType The connection type to change to.
 @param {Array} testableConnections Connection types that currently support testing via
  Airflow REST API.
 */
function handleTestConnection(connectionType, testableConnections) {
  const testButton = document.getElementById("test-connection");

  if (configTestConnection === "hidden") {
    // If test connection is hidden in config, hide button and return.
    $(testButton).hide();
    return;
  }
  if (configTestConnection !== "enabled") {
    // If test connection is not enabled in config, disable button and display toolip
    // alerting the user.
    $(testButton)
      .prop("disabled", true)
      .attr(
        "title",
        "Testing connections is disabled in Airflow configuration. Contact your deployment admin to enable it."
      );
    return;
  }

  const testConnEnabled = testableConnections.includes(connectionType);

  if (testConnEnabled) {
    // If connection type can be tested in via REST API, enable button and clear toolip.
    $(testButton).prop("disabled", false).removeAttr("title");
  } else {
    // If connection type can NOT be tested via REST API, disable button and display toolip
    // alerting the user.
    $(testButton)
      .prop("disabled", true)
      .attr(
        "title",
        "This connection type does not currently support testing via " +
          "Airflow REST API."
      );
  }
}

$(document).ready(() => {
  const fieldBehavioursElem = document.getElementById("field_behaviours");
  const config = JSON.parse(decode(fieldBehavioursElem.textContent));
  const testableConnsElem = document.getElementById(
    "testable_connection_types"
  );
  const testableConns = decode(testableConnsElem.textContent);

  // Prevent login/password fields from triggering browser auth extensions
  const form = document.getElementById("model_form");
  if (form) form.setAttribute("autocomplete", "off");

  // Save all DOM elements into a map on load.
  const controlsContainer = getControlsContainer();
  const connTypesToControlsMap = getConnTypesToControlsMap();

  // Create a test connection button & insert it right next to the save (submit) button
  const testConnBtn = $(
    '<button id="test-connection" type="button" class="btn btn-sm btn-primary" ' +
      'style="margin-left: 3px; pointer-events: all">测试\n <i class="fa fa-rocket"></i></button>'
  );

  // Disable the Test Connection button if Airflow REST APIs are not enabled.
  if (!restApiEnabled) {
    $(testConnBtn)
      .prop("disabled", true)
      .attr(
        "title",
        "Airflow REST APIs have been disabled. " +
          "See api->auth_backends section of the Airflow configuration."
      );
  }

  $(testConnBtn).insertAfter(
    $("form#model_form div.well.well-sm button:submit")
  );

  /**
   * Changes the connection type.
   * @param {string} connType The connection type to change to.
   */
  function changeConnType(connType) {
    Array.from(connTypesToControlsMap.values()).forEach((controls) => {
      controls
        .filter((control) => control.parentElement === controlsContainer)
        .forEach((control) => controlsContainer.removeChild(control));
    });

    const controls = connTypesToControlsMap.get(connType) || [];
    controls.forEach((control) => controlsContainer.appendChild(control));

    // Restore field behaviours.
    restoreFieldBehaviours();

    // Apply behaviours to fields.
    applyFieldBehaviours(config[connType]);

    // Enable/Disable the Test Connection button. Only applicable if Airflow REST APIs are enabled.
    if (restApiEnabled) {
      handleTestConnection(connType, testableConns);
    }
  }

  /**
   * Displays the Flask style alert on UI via JS
   *
   * @param {string} status - Status can be either success, error, or warning
   * @param {string} message - The text message to show in alert box
   */
  function displayAlert(status, message) {
    const alertClass = `alert-${status}`;
    let alertBox = $(".container .row .alert");
    if (alertBox.length) {
      alertBox.removeClass("alert-success").removeClass("alert-error");
      alertBox.addClass(alertClass);
      alertBox.text(message);
      alertBox.show();
    } else {
      alertBox = $(
        `<div class="alert ${alertClass}">\n` +
          `<button type="button" class="close" data-dismiss="alert">×</button>\n${message}</div>`
      );

      $(".container .row").prepend(alertBox).show();
    }
  }

  displayAlert(
    "warning",
    "警告：当前已填充的字段可以修改，但不能删除。若要删除字段中的数据，请删除连接对象并重新创建一个新的连接对象。"
  );

  function hideAlert() {
    const alertBox = $(".container .row .alert");
    alertBox.hide();
  }

  /**
   * Produces JSON stringified data from a html form data
   *
   * @param {string} selector Jquery from selector string.
   * @returns {string} Form data as a JSON string
   */
  function getSerializedFormData(selector) {
    const outObj = {};
    const extrasObj = {};
    const inArray = $(selector).serializeArray();

    /*
    Form data fields are processed in the below order:
        - csrf_token
        - conn_id
        - conn_type
        - description
        - host
        - schema
        - login
        - password
        - port
        - extra
        - All other custom form fields (i.e. fields that are named ``extra__...``) in
          alphabetical order
    */
    // eslint-disable-next-line func-names
    $.each(inArray, function () {
      if (this.name === "conn_id") {
        outObj.connection_id = this.value;
      } else if (this.value !== "" && this.name === "port") {
        outObj[this.name] = Number(this.value);
      } else if (this.value !== "" && this.name !== "csrf_token") {
        // Check if there are values in the classic Extra form field. These values come in
        // stringified and need to be converted to a JSON object in case there are custom form
        // field values that also need to be included in the ``extra`` object for the output
        // payload.
        if (this.name === "extra") {
          let extra;
          try {
            extra = JSON.parse(this.value);
          } catch (e) {
            if (e instanceof SyntaxError) {
              displayAlert("error", "额外字段的值不是有效的 JSON。");
            }
            throw e;
          }

          Object.entries(extra).forEach(([key, val]) => {
            extrasObj[key] = val;
          });
          // Check if field is a custom form field.
        } else if (this.name.startsWith("extra__")) {
          // prior to Airflow 2.3 custom fields were stored in the extra dict with prefix
          // post-2.3 we allow to use with no prefix
          // here we don't know which we are configured to use, so we populate both
          extrasObj[this.name] = this.value;
          extrasObj[this.name.replace(/extra__.+?__/, "")] = this.value;
        } else {
          outObj[this.name] = this.value;
        }
      }
    });

    // Stringify all extras for the AJAX call payload.
    outObj.extra = JSON.stringify(extrasObj);
    return JSON.stringify(outObj);
  }

  // Bind click event to Test Connection button & perform an AJAX call via REST API
  $("#test-connection").on("click", (e) => {
    e.preventDefault();
    hideAlert();
    // save the contents of the CodeMirror editor to the textArea if it is populated
    // (i.e., connection type has extra field)
    if (Object.prototype.hasOwnProperty.call(editor, "save")) {
      editor.save();
    }
    $.ajax({
      url: connectionTestUrl,
      type: "post",
      contentType: "application/json",
      dataType: "json",
      data: getSerializedFormData("form#model_form"),
      success(data) {
        displayAlert("success", data.message);
      },
      error(jq, err, msg) {
        displayAlert("error", msg);
      },
    });
  });

  const connTypeElem = document.getElementById("conn_type");
  $(connTypeElem).on("change", (e) => {
    const connType = e.target.value;
    changeConnType(connType);
  });

  // Initialize the form by setting a connection type.
  changeConnType(connTypeElem.value);

  // Get all textarea elements
  const textAreas = document.getElementsByTagName("textarea");

  Array.from(textAreas).forEach((textArea) => {
    if (textArea.id !== "description" && !$(textArea).is(":hidden")) {
      // Change TextArea widget to CodeMirror
      editor = CodeMirror.fromTextArea(textArea, {
        mode: { name: "javascript", json: true },
        gutters: ["CodeMirror-lint-markers"],
        lineWrapping: true,
        lint: true,
      });

      // beautify JSON but only if it is not equal to default value of empty string
      const jsonData = editor.getValue();
      if (jsonData !== "") {
        const data = JSON.parse(jsonData);
        const formattedData = JSON.stringify(data, null, 2);
        editor.setValue(formattedData);
      }
    }
  });
});
