// Builds the body the website forwards for PATCH /admin/api/finance/transactions/:id.
// Only known fields with the right types pass through, so the page can't send
// anything else to the API. Returns { body } or { error } for a 400.
function buildTransactionPatch(input) {
  var src = input || {};
  var body = {};
  if (typeof src.hidden === "boolean") body.hidden = src.hidden;
  if (typeof src.tag_id === "string") {
    if (src.tag_id !== "" && !/^[a-f0-9]{24}$/.test(src.tag_id)) return { error: "invalid tag id" };
    body.tag_id = src.tag_id;
  }
  if (src.apply_to_merchant === true) body.apply_to_merchant = true;
  if (typeof src.hide_merchant === "boolean") body.hide_merchant = src.hide_merchant;
  return { body: body };
}

module.exports = { buildTransactionPatch: buildTransactionPatch };
