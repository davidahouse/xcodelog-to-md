#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const lineReader = require("line-reader");
const program = require("commander");

program
  .option("-i, --input <input>", "The path to the xcodebuild log file to parse")
  .option(
    "-r, --root <root>",
    "The root of where the source code can be found so we can strip off paths in output"
  )
  .option("-o, --output <output>", "summary or text output")
  .option(
    "-s, --sha <sha>",
    "The SHA for this commit so we can link to the error"
  )
  .option(
    "-u, --url <url>",
    "URL for the repository so we can link to the error"
  );
program.parse(process.argv);

if (program.input == null) {
  console.log("No input file specified");
  process.exit(1);
}

let rootPrefix = path.dirname(path.resolve(program.input));
if (program.root != null) {
  rootPrefix = program.root;
}
const errors = [];
let currentError = null;

lineReader.eachLine(program.input, function (line, last) {
  if (currentError != null) {
    currentError.codeLine = line;
    errors.push(currentError);
    currentError = null;
  }

  if (line.indexOf(" error:") > 0) {
    const parts = line.split("error:");
    const fileParts = parts[0].split(":");
    const file = fileParts[0];
    const errorLine = fileParts.length > 1 ? fileParts[1] : "";
    const errorColumn = fileParts.length > 2 ? fileParts[2] : "";
    const error = parts[1];
    currentError = {
      file: file,
      line: errorLine,
      column: errorColumn,
      error: error,
      severity: "Error",
    };
  }

  if (last) {
    if (program.output === "text") {
      outputText();
    } else {
      outputSummary();
    }
  }
});

function outputText() {
  let files = {};
  errors.forEach(function (error) {
    const fileName = error.file.replace(rootPrefix + "/", "").trim();
    if (files[fileName] == null) {
      files[fileName] = {
        errors: [error],
      };
    } else {
      files[fileName].errors.push(error);
    }
  });

  Object.keys(files).forEach(function (key) {
    files[key].errors.forEach(function (error) {
      if (program.sha != null && program.url != null) {
        console.log(
          "[" +
            key +
            "(" +
            error.line +
            ":" +
            error.column +
            ")](" +
            program.url +
            "/blob/" +
            program.sha +
            "/" +
            key +
            ")"
        );
      } else {
        console.log(key + " (" + error.line + ":" + error.column + ")");
      }

      console.log("```");
      console.log(error.codeLine.trim());
      console.log("```");
      console.log("> :heavy_exclamation_mark: " + error.error.trim());
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
  console.log(
    "- :heavy_exclamation_mark: " + errors.length.toString() + " Error(s)"
  );
}
