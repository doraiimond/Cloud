export const msalConfig = {
  auth: {
    clientId: "d4ee3773-92f3-4399-8a71-b0b97d2ce325",
    authority: "https://login.microsoftonline.com/94c782f9-2f68-43cd-b7f9-91651c6c4350",
    redirectUri: "http://localhost:5173"
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false
  }
};

export const loginRequest = {
  scopes: ["User.Read"]
};