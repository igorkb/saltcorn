const renderForm = require("./form");
const renderBuilder = require("./builder");
const mkTable = require("./table");
const tabs = require("./tabs");
const { a, text } = require("./tags");

const link = (href, s) => a({ href: text(href) }, text(s));

const post_btn = (
  href,
  s,
  csrfToken,
  { btnClass = "primary", onClick, small, klass = "", formClass } = {}
) =>
  `<form action="${text(href)}" method="post"${
    formClass ? `class="${formClass}"` : ""
  }>
  <input type="hidden" name="_csrf" value="${csrfToken}">
<button type="submit" ${
    onClick ? `onclick="${onClick}"` : ""
  } class="${klass} btn ${
    small ? "btn-sm" : ""
  } btn-${btnClass}">${s}</button></form>`;

const post_delete_btn = (href, csrfToken) =>
  post_btn(href, '<i class="fas fa-trash"></i>', csrfToken, {
    btnClass: "danger",
    small: true,
  });

module.exports = {
  mkTable,
  renderForm,
  renderBuilder,
  link,
  post_btn,
  post_delete_btn,
  tabs,
};
