"use strict";

function shouldSkipElement(name) {
  return !name || name === "Fragment" || name === "React.Fragment";
}

function getJsxName(node) {
  if (!node) return "";
  if (node.type === "JSXIdentifier") return node.name;
  if (node.type === "JSXMemberExpression") {
    return `${getJsxName(node.object)}.${getJsxName(node.property)}`;
  }
  if (node.type === "JSXNamespacedName") {
    return `${getJsxName(node.namespace)}:${getJsxName(node.name)}`;
  }
  return "";
}

function hasAttribute(attributes, name) {
  return attributes.some((attribute) => {
    return attribute && attribute.type === "JSXAttribute" && attribute.name && attribute.name.name === name;
  });
}

function addStringAttribute(t, attributes, name, value) {
  if (value === undefined || value === null || value === "" || hasAttribute(attributes, name)) {
    return;
  }

  attributes.push(t.jsxAttribute(t.jsxIdentifier(name), t.stringLiteral(String(value))));
}

function cliteBabelPlugin(api, pluginOptions) {
  const t = api.types;
  const options = pluginOptions || {};
  const enabled = options.enabled !== false;
  const includeNodeModules = options.includeNodeModules === true;
  const componentAttribute = options.componentAttribute || "data-clite-component";
  const sourceAttribute = options.sourceAttribute || "data-clite-source";
  const lineAttribute = options.lineAttribute || "data-clite-line";
  const columnAttribute = options.columnAttribute || "data-clite-column";

  return {
    name: "clite-jsx-source-attributes",
    visitor: {
      JSXOpeningElement(path, state) {
        if (!enabled) return;

        const filename = state.file && state.file.opts && state.file.opts.filename;
        if (!filename) return;
        if (!includeNodeModules && filename.includes("node_modules")) return;

        const componentName = getJsxName(path.node.name);
        if (shouldSkipElement(componentName)) return;

        const location = path.node.loc && path.node.loc.start;
        const attributes = path.node.attributes;

        addStringAttribute(t, attributes, componentAttribute, componentName);
        addStringAttribute(t, attributes, sourceAttribute, filename);
        if (location) {
          addStringAttribute(t, attributes, lineAttribute, location.line);
          addStringAttribute(t, attributes, columnAttribute, location.column + 1);
        }
      }
    }
  };
}

module.exports = cliteBabelPlugin;
module.exports.default = cliteBabelPlugin;
