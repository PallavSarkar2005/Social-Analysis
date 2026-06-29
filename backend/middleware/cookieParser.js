export const cookieParser = (req, res, next) => {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      let [name, ...rest] = cookie.split("=");
      name = name.trim();
      if (name) {
        list[name] = decodeURIComponent(rest.join("=").trim());
      }
    });
  }
  req.cookies = list;
  next();
};
