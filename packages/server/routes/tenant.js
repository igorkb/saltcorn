const Router = require("express-promise-router");
const Form = require("@saltcorn/data/models/form");
const { getState, create_tenant } = require("@saltcorn/data/db/state");
const {
  getAllTenants,
  domain_sanitize,
  deleteTenant,
} = require("@saltcorn/data/models/tenant");
const { renderForm, link, post_btn, mkTable } = require("@saltcorn/markup");
const { div, nbsp, p, a } = require("@saltcorn/markup/tags");
const db = require("@saltcorn/data/db");
const url = require("url");
const { loadAllPlugins } = require("../load_plugins");
const { setTenant, isAdmin, error_catcher } = require("./utils.js");

const router = new Router();
module.exports = router;

const tenant_form = () =>
  new Form({
    action: "/tenant/create",
    submitLabel: "Create",
    labelCols: 4,
    blurb:
      "Please select a name for your application. The name will determine the address at which it will be available. ",
    fields: [
      {
        name: "subdomain",
        label: "Application name",
        input_type: "text",
        postText: ".saltcorn.com",
      },
    ],
  });
//TODO only if multi ten and not already in subdomain
router.get(
  "/create",
  setTenant,
  error_catcher(async (req, res) => {
    if (!db.is_it_multi_tenant() || db.getTenantSchema() !== "public") {
      res.sendWrap(`Create application`, "Multi-tenancy not enabled");
      return;
    }
    req.flash(
      "warning",
      '<h4>Warning</h4><p>Hosting on this site is provided for free and with no guarantee of availability or security of your application. This facility is intended solely for you to evaluate the suitability of Saltcorn. If you would like to store private information that needs to be secure, please use self-hosted Saltcorn. See <a href="https://github.com/saltcorn/saltcorn">GitHub repository</a> for instructions<p>'
    );
    res.sendWrap(
      `Create application`,
      renderForm(tenant_form(), req.csrfToken())
    );
  })
);

const getNewURL = (req, subdomain) => {
  var ports = "";
  const host = req.get("host");
  if (typeof host === "string") {
    const hosts = host.split(":");
    if (hosts.length > 1) ports = `:${hosts[1]}`;
  }
  const newurl = `${req.protocol}://${subdomain}.${req.hostname}${ports}/`;

  return newurl;
};

router.post(
  "/create",
  setTenant,
  error_catcher(async (req, res) => {
    if (!db.is_it_multi_tenant() || db.getTenantSchema() !== "public") {
      res.sendWrap(`Create application`, "Multi-tenancy not enabled");
      return;
    }
    const form = tenant_form();
    const valres = form.validate(req.body);
    if (valres.errors)
      res.sendWrap(`Create application`, renderForm(form, req.csrfToken()));
    else {
      const subdomain = domain_sanitize(valres.success.subdomain);
      const allTens = await getAllTenants();
      if (allTens.includes(subdomain) || !subdomain) {
        form.errors.subdomain = "A site with this subdomain already exists";
        form.hasErrors = true;
        res.sendWrap(`Create application`, renderForm(form, req.csrfToken()));
      } else {
        await create_tenant(subdomain, loadAllPlugins);
        const newurl = getNewURL(req, subdomain);
        res.sendWrap(
          `Create application`,
          div(
            div("Success! Your new application is available at:"),

            div(
              { class: "my-3", style: "font-size: 22px" },
              a({ href: newurl, class: "new-tenant-link" }, newurl)
            ),
            p("Please click the above link now to create the first user.")
          )
        );
      }
    }
  })
);

router.get(
  "/list",
  setTenant,
  isAdmin,
  error_catcher(async (req, res) => {
    if (!db.is_it_multi_tenant() || db.getTenantSchema() !== "public") {
      res.sendWrap(`Create application`, "Multi-tenancy not enabled");
      return;
    }
    const tens = await db.select("_sc_tenants");
    res.sendWrap("Tenant", {
      above: [
        {
          type: "breadcrumbs",
          crumbs: [{ text: "Settings" }, { text: "Tenants" }],
        },
        {
          type: "card",
          title: "Tenants",
          contents: [
            mkTable(
              [
                { label: "Subdomain", key: "subdomain" },
                { label: "email", key: "email" },
                {
                  label: "Delete",
                  key: (r) =>
                    post_btn(
                      `/tenant/delete/${r.subdomain}`,
                      "Delete",
                      req.csrfToken()
                    ),
                },
              ],
              tens
            ),
            div(`Found ${tens.length} tenants`),
          ],
        },
      ],
    });
  })
);

router.post(
  "/delete/:sub",
  setTenant,
  isAdmin,
  error_catcher(async (req, res) => {
    if (!db.is_it_multi_tenant() || db.getTenantSchema() !== "public") {
      res.sendWrap(`Create application`, "Multi-tenancy not enabled");
      return;
    }
    const { sub } = req.params;

    await deleteTenant(sub);
    res.redirect(`/tenant/list`);
  })
);
