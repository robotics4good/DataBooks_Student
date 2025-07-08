import { useEffect, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import mqtt from "mqtt";

const MQTT_URL = "ws://broker.emqx.io:8083/mqtt";
const TOPIC = "test/topic";

const GamePage = () => {
  const [data, setData] = useState([
    { id: "series1", data: [] },
  ]);

  useEffect(() => {
    const client = mqtt.connect(MQTT_URL);

    client.on("connect", () => {
      console.log("Connected to MQTT broker!");
      client.subscribe(TOPIC);
    });

    client.on("message", (topic, message) => {
      const value = parseFloat(message.toString());

      setData(prevData =>
        prevData.map(series => ({
          ...series,
          data: [
            ...series.data.slice(-19),
            { x: new Date().toLocaleTimeString(), y: value }
          ]
        }))
      );
    });

    return () => client.end();
  }, []);

  return (
    <div style={{ height: "100vh", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ height: "80%", width: "80%" }}>
        <ResponsiveLine
          data={data}
          margin={{ top: 50, right: 50, bottom: 50, left: 50 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: 0, max: 100 }}
          axisBottom={{ legend: "Time", legendOffset: 36, legendPosition: "middle" }}
          axisLeft={{ legend: "Value", legendOffset: -40, legendPosition: "middle" }}
          colors={{ scheme: "category10" }}
          pointSize={10}
          pointBorderWidth={2}
          useMesh={true}
        />
      </div>
    </div>
  );
};

export default GamePage;
