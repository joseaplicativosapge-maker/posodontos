import axios from "axios";

const factusApi = axios.create({
  baseURL: process.env.FACTUS_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let accessToken: string | null = null;

async function authenticateFactus() {
  if (accessToken) return accessToken;

  const response = await axios.post(
    `${process.env.FACTUS_BASE_URL}/oauth/token`,
    {
      grant_type: "password",
      client_id: process.env.CLIENTID_FACTUS,
      client_secret: process.env.CLIENTSECRET_FACTUS,
      username: process.env.USERNAME_FACTUS,
      password: process.env.PASSWORD_FACTUS,
    }
  );

  accessToken = response.data.access_token;
  return accessToken;
}

factusApi.interceptors.request.use(async (config) => {
  const token = await authenticateFactus();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function crearFactura(data: any) {
  const response = await factusApi.post("/v1/billing/invoices", data);
  return response.data;
}

export async function obtenerFactura(uuid: string) {
  const response = await factusApi.get(`/v1/billing/invoices/${uuid}`);
  return response.data;
}