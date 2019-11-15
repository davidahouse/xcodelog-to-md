#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const lineReader = require("line-reader");

const input = process.argv.length > 2 ? process.argv[2] : null;
if (input == null) {
  console.log("No input file specified");
  process.exit(1);
}

let output = "summary";
if (process.argv.length > 3) {
  output = process.argv[3];
}

let sha = null;
if (process.argv.length > 4) {
  sha = process.argv[4];
}

let repoUrl = null;
if (process.argv.length > 5) {
  repoUrl = process.argv[5];
}

const rootPrefix = path.dirname(path.resolve(input));
const errors = [];
const warnings = [];
let currentError = null;

lineReader.eachLine(input, function(line, last) {
  if (currentError != null) {
    currentError.codeLine = line;
    errors.push(currentError);
    currentError = null;
  }

  if (line.indexOf("error:") > 0) {
    const parts = line.split("error:");
    const fileParts = parts[0].split(":");
    const file = fileParts[0];
    const errorLine = fileParts[1];
    const errorColumn = fileParts[2];
    const error = parts[1];
    currentError = {
      file: file,
      line: errorLine,
      column: errorColumn,
      error: error,
      severity: "Error"
    };
  }

  if (last) {
    if (output === "text") {
      outputText();
    } else {
      outputSummary();
    }
  }
});

function outputText() {
  let files = {};
  errors.forEach(function(error) {
    const fileName = error.file.replace(rootPrefix + "/", "").trim();
    if (files[fileName] == null) {
      files[fileName] = {
        errors: [error],
        warnings: []
      };
    } else {
      files[fileName].errors.push(error);
    }
  });

  Object.keys(files).forEach(function(key) {
    files[key].errors.forEach(function(error) {
      if (sha != null && repoUrl != null) {
        console.log(
          ":heavy_exclamation_mark: [" +
            error.line +
            ":" +
            error.column +
            "]" +
            " [" +
            key +
            "](" +
            repoUrl +
            "/blob/" +
            sha +
            "/" +
            key +
            ")"
        );
      } else {
        console.log(
          ":heavy_exclamation_mark: " +
            key +
            " [" +
            error.line +
            ":" +
            error.column +
            "]"
        );
      }

      console.log('<div class="highlight highlight-source-diff">');
      console.log("<pre>");
      console.log('<span class="pl-mi1">');
      console.log(error.codeLine.trim());
      console.log("</span>");
      console.log('<span class="pl-md">');
      console.log(error.error.trim());
      console.log("</span>");
      console.log("</pre>");
      console.log("</div>");
      console.log(" ");
      console.log("---");
      console.log(" ");
    });
    console.log(" ");
  });
}

function outputSummary() {
  console.log("### xcodebuild Summary:");
  console.log(" ");
  console.log("- :warning: " + warnings.length.toString() + " Warning(s)");
  console.log(
    "- :heavy_exclamation_mark: " + errors.length.toString() + " Error(s)"
  );
}
