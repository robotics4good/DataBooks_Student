// plots/AreaPlot.js
import { ResponsiveAreaBump } from "@nivo/bump";

const AreaPlot = ({ data }) => {
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ResponsiveAreaBump
        data={data}
        margin={{ top: 40, right: 100, bottom: 40, left: 60 }}
        spacing={8}
        colors={{ scheme: "category10" }}
        blendMode="multiply"
        defs={[
          {
            id: "dots",
            type: "patternDots",
            background: "inherit",
            color: "#38bcb2",
            size: 4,
            padding: 1,
            stagger: true,
          },
        ]}
        fill={[{ match: "*", id: "dots" }]}
      />
    </div>
  );
};

export default AreaPlot;
