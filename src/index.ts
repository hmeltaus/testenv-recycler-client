import { request } from "https"

export interface Credentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  expiration: Date
}

export interface Account {
    id: string
}

export interface Reservation {
    id: string
    timestamp: number
    accountCount: number
    name: string
    ready: boolean
    accounts: ReadonlyArray<Account>
    credentials?: Credentials
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
        path,
        headers,
      },
      (res) => {
        if (res.statusCode !== 200) {
            console.log(`Request failed with http status: ${res.statusCode}`)
        }

        const onComplete = (res.statusCode === 200) ? resolve : reject
        res.on("data", (chunk) => {
          body += chunk
        })
        res.on("end", () => onComplete(JSON.parse(body)))
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
        path,
        headers,
      },
      (res) => {
        if (res.statusCode !== 200) {
          console.log(`Request failed with http status: ${res.statusCode}`)
        }

        const onComplete = (res.statusCode === 200) ? resolve : reject
        res.on("data", (chunk) => {
          body += chunk
        })
        res.on("end", () => onComplete(JSON.parse(body)))
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
        path,
        headers,
      },
      (res) => {
        if (res.statusCode !== 200) {
          console.log(`Request failed with http status: ${res.statusCode}`)
        }

        const onComplete = (res.statusCode === 200) ? resolve : reject
        res.on("data", (chunk) => {
          body += chunk
        })
        res.on("end", () => onComplete(JSON.parse(body)))
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

    while (!reservation.ready) {
      await sleep(2000)
      this.log("Reservation not yet ready")

      try {
          reservation = await get(
            this.props,
            this.token,
            `/reservations/${reservation.id}`,
          )
      } catch (e) {
          this.log(`Reservation could not be fulfilled: ${e}`)
      }
    }

    this.log(
      `Reservation ready with accounts: ${reservation.accounts
        .map((a) => a.id)
        .join(", ")}`,
    )

    const credentials = reservation.credentials as Credentials

    return {
        ...reservation,
        credentials: {
            ...credentials,
            expiration: new Date(credentials.expiration)
        }
    }
  }

  releaseReservation = async (reservationId: string) => {
    this.log(`Release reservation ${reservationId}`)
    await del(this.props, this.token, `/reservations/${reservationId}`)
  }
}
