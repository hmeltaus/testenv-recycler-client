//module.exports =
const https = require("https")

const get = async (props, path) => {
  return new Promise((resolve, reject) => {
    let body = ""
    const req = https.request(
      {
        hostname: props.hostname,
        method: "GET",
        path: `${props.basePath}${path}`,
        headers: {
          Authorization: Buffer.from(
            `${props.clientId}:${props.clientPassword}`,
          ).toString("base64"),
          "Content-Type": "application/json",
        },
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
}

const del = async (props, path) => {
  return new Promise((resolve, reject) => {
    let body = ""
    const req = https.request(
      {
        hostname: props.hostname,
        method: "DELETE",
        path: `${props.basePath}${path}`,
        headers: {
          Authorization: Buffer.from(
            `${props.clientId}:${props.clientPassword}`,
          ).toString("base64"),
          "Content-Type": "application/json",
        },
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
}

const post = async (props, path, payload) => {
  const payloadString = JSON.stringify(payload)
  return new Promise((resolve, reject) => {
    let body = ""
    const req = https.request(
      {
        hostname: props.hostname,
        method: "POST",
        path: `${props.basePath}${path}`,
        headers: {
          Authorization: Buffer.from(
            `${props.clientId}:${props.clientPassword}`,
          ).toString("base64"),
          "Content-Length": payloadString.length,
          "Content-Type": "application/json",
        },
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
}

const sleep = async (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

export default class Recycler {
  constructor(props) {
    this.props = props
  }

  createReservation = async ({ type, count }) => {
    let reservation = await post(this.props, "/reservations", { type, count })
    while (reservation.status === "pending") {
      console.log(reservation.status)
      await sleep(2000)
      console.log("Waiting...")
      reservation = await get(this.props, `/reservations/${reservation.id}`)
    }

    console.log(JSON.stringify(reservation))
    if (reservation.status !== "ready") {
      throw new Error(`Reservation could not be fulfilled`)
    }

    return reservation
  }

  releaseReservation = async (reservationId) =>
    del(this.props, `/reservations/${reservationId}`)
}
