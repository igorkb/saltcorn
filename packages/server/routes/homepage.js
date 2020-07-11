const { getState } = require("@saltcorn/data/db/state");
const db = require("@saltcorn/data/db");
const View = require("@saltcorn/data/models/view");
const User = require("@saltcorn/data/models/user");
const Page = require("@saltcorn/data/models/page");
const { link, renderForm, mkTable, post_btn } = require("@saltcorn/markup");
const { ul, li, div, small, a, h5, h2, h3 } = require("@saltcorn/markup/tags");
const Table = require("@saltcorn/data/models/table");
const { fetch_available_packs } = require("@saltcorn/data/models/pack");

const tableTable = tables =>
  mkTable(
    [
      { label: "Name", key: "name" },
      { label: "Edit", key: r => link(`/table/${r.id}`, "Edit") }
    ],
    tables
  );

const viewTable = views =>
  mkTable(
    [
      { label: "Name", key: "name" },
      {
        label: "Edit",
        key: r => link(`viewedit/edit/${encodeURIComponent(r.name)}`, "Edit")
      }
    ],
    views
  );

const no_views_logged_in_user = async (role, req, res) => {
  const views = await View.find({});
  const show_views =
    views.length === 0
      ? ""
      : h3("Views") + ul(views.map(v => li(link(`/view/${v.name}`, v.name))));
  const all_pages = await Page.find({})
  const pages = all_pages.filter(p => role <= p.min_role);
  const show_pages =
    pages.length === 0
      ? ""
      : h3("Pages") + ul(pages.map(v => li(link(`/page/${v.name}`, v.name))));
  res.sendWrap("Hello", h2("Welcome to saltcorn!") + show_pages + show_views);
};

const no_views_logged_in = async (req, res) => {
  const role = req.isAuthenticated() ? req.user.role_id : 10;
  if (role > 1 || req.user.tenant !== db.getTenantSchema())
    await no_views_logged_in_user(role, req, res);
  else {
    const tables = await Table.find({}, { orderBy: "name" });
    const views = await View.find({});
    if (tables.length === 0) {
      const packs_available = await fetch_available_packs();
      const packs_installed = getState().getConfig("installed_packs", []);

      res.sendWrap("Hello", {
        above: [
          {
            type: "pageHeader",
            title: "Quick Start"
          },
          {
            type: "card",
            title: "Tables",
            contents: div(
              div("You have no tables and no views!"),
              div(
                a(
                  { href: `/table/new`, class: "btn btn-primary" },
                  "Create a table »"
                )
              )
            )
          },
          {
            type: "card",
            title: "Packs",
            contents: [
              div(
                "Packs are collections of tables, views and plugins that give you a full application which you can then edit to suit your needs."
              ),
              mkTable(
                [
                  { label: "Name", key: "name" },
                  {
                    label: "Install",
                    key: r =>
                      packs_installed.includes(r.name)
                        ? "Installed"
                        : post_btn(
                            `/packs/install-named/${encodeURIComponent(
                              r.name
                            )}`,
                            "Install",
                            req.csrfToken()
                          )
                  }
                ],
                packs_available
              )
            ]
          }
        ]
      });
    } else if (views.length === 0) {
      res.sendWrap("Hello", {
        above: [
          {
            type: "pageHeader",
            title: "Quick Start"
          },
          {
            type: "card",
            title: "Tables",
            contents: div(
              tableTable(tables),
              div(
                a(
                  { href: `/table/new`, class: "btn btn-primary" },
                  "Create a table"
                )
              )
            )
          },
          {
            type: "card",
            title: "Views",
            contents: [
              div("You have no views!"),
              div(
                a(
                  { href: `/viewedit/new`, class: "btn btn-primary" },
                  "Create a view »"
                )
              )
            ]
          }
        ]
      });
    } else {
      res.sendWrap("Hello", {
        above: [
          {
            type: "pageHeader",
            title: "Quick Start"
          },
          {
            type: "card",
            title: "Tables",
            contents: div(
              tableTable(tables),
              div(
                a(
                  { href: `/table/new`, class: "btn btn-primary" },
                  "Create a table"
                )
              )
            )
          },
          {
            type: "card",
            title: "Views",
            contents: [
              viewTable(views),
              div(
                a(
                  { href: `/viewedit/new`, class: "btn btn-primary" },
                  "Create a view"
                )
              )
            ]
          }
        ]
      });
    }
  }
};

const get_config_response = async (cfgKey, res) => {
  const homeCfg = getState().getConfig(cfgKey);
  if (homeCfg) {
    if (getState().pages[homeCfg]) {
      const page = getState().pages[homeCfg];
      const contents = await page.getPage();
      res.sendWrap(
        page.title
          ? { title: page.title, description: page.description }
          : homeCfg,
        contents
      );
      return true;
    } else {
      const db_page = await Page.findOne({ name: homeCfg });
      if (db_page) {
        res.sendWrap(
          { title: db_page.title, description: db_page.description } ||
            `${pagename} page`,
          db_page.layout
        );
      } else res.redirect(homeCfg);
      return true;
    }
  }
};
module.exports = async (req, res) => {
  const isAuth = req.isAuthenticated();
  if (!isAuth) {
    const cfgResp = await get_config_response("public_home", res);
    if (cfgResp) return;
  } else if (isAuth && req.user.role_id === 8) {
    const cfgResp = await get_config_response("user_home", res);
    if (cfgResp) return;
  }

  if (!isAuth) {
    const hasUsers = await User.nonEmpty();
    if (!hasUsers) {
      res.redirect("/auth/create_first_user");
      return;
    } else res.redirect("/auth/login");
  } else {
    await no_views_logged_in(req, res);
  }
};
