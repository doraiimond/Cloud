export const msalConfig = {
  auth: {
    clientId: "5c8ea2ab-fda4-4285-958b-8867d2709db8",
    authority: "https://login.microsoftonline.com/40a08301-482d-491e-aa8b-d9da95e2b327",
    redirectUri: "https://32.196.153.180.sslip.io"
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false
  }
};

export const loginRequest = {
  scopes: ["User.Read"]
};