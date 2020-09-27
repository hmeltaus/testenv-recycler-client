import { request } from "https"

export interface AccountSlot {
  slot: string
  accountId: string | null
  status: "pending" | "ready" | "failed" | string
}

export interface ReservationCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}

export interface Reservation {
  id: string
  created: number
  expires: number
  status: "pending" | "ready" | "failed" | "expired" | string
  accounts: AccountSlot[]
  credentials: ReservationCredentials
}

const get = async (
  props: RecyclerProps,
  token: string | null,
  path: string,
): Promise<any> =>
  new Promise((resolve, reject) => {
    let body = ""
    const headers: any = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const req = request(
      {
        hostname: props.hostname,
        method: "GET",
        path: `${props.basePath}${path}`,
        headers,
      },
      (res) => {
        res.on("data", (chunk) => {
          body += chunk
        })
        res.on("end", () => resolve(JSON.parse(body)))
      },
    )

    req.on("error", (e) => reject(e))
    req.end()
  })

const del = async (props: RecyclerProps, token: string | null, path: string) =>
  new Promise((resolve, reject) => {
    let body = ""

    const headers: any = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
    const req = request(
      {
        hostname: props.hostname,
        method: "DELETE",
        path: `${props.basePath}${path}`,
        headers,
      },
      (res) => {
        res.on("data", (chunk) => {
          body += chunk
        })
        res.on("end", () => resolve(JSON.parse(body)))
      },
    )

    req.on("error", (e) => reject(e))
    req.end()
  })

const post = async (
  props: RecyclerProps,
  token: string | null,
  path: string,
  payload: any,
) =>
  new Promise((resolve, reject) => {
    const payloadString = JSON.stringify(payload)
    let body = ""

    const headers: any = {
      "Content-Type": "application/json",
      "Content-Length": payloadString.length,
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const req = request(
      {
        hostname: props.hostname,
        method: "POST",
        path: `${props.basePath}${path}`,
        headers,
      },
      (res) => {
        res.on("data", (chunk) => {
          body += chunk
        })
        res.on("end", () => resolve(JSON.parse(body)))
      },
    )

    req.on("error", (e) => reject(e))
    req.write(payloadString)
    req.end()
  })

const sleep = async (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

export interface RecyclerProps {
  name: string
  hostname: string
  basePath?: string
  username: string
  password: string
}

export interface CreateReservationInput {
  count: number
  name: string
}

export class Recycler {
  private readonly props: RecyclerProps
  private token: string | null = null

  constructor(props: RecyclerProps) {
    this.props = props
  }

  private log = (msg: string): void => {
    console.log(`${this.props.name} - ${msg}`)
  }

  login = async (): Promise<void> => {
    this.log("Login")
    const { token }: any = await post(this.props, null, "/login", {
      username: this.props.username,
      password: this.props.password,
    })

    this.token = token
  }

  createReservation = async ({
    name,
    count,
  }: CreateReservationInput): Promise<Reservation> => {
    this.log(`Create reservation with count: ${count}`)
    let reservation = (await post(this.props, this.token, "/reservations", {
      count,
      name,
    })) as Reservation

    this.log(`Reservation created successfully with id: ${reservation.id}`)

    while (reservation.status === "pending") {
      await sleep(2000)
      this.log("Reservation not yet ready")
      reservation = await get(
        this.props,
        this.token,
        `/reservations/${reservation.id}`,
      )
    }

    if (reservation.status !== "ready") {
      throw new Error(`Reservation could not be fulfilled`)
    }

    this.log(
      `Reservation ready with accounts: ${reservation.accounts
        .map((a) => a.accountId)
        .join(", ")}`,
    )
    return reservation
  }

  releaseReservation = async (reservationId: string) =>
    del(this.props, this.token, `/reservations/${reservationId}`)
}
