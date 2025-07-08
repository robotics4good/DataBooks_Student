import { ResponsiveNetwork } from '@nivo/network';

const CustomNode = ({ node, animated }) => {
  // Person icon SVG path - using a simpler person icon for better visibility
  const personPath = "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z";

  return node.isCenter ? (
    <circle
      r={node.size}
      fill={node.color}
      stroke={node.borderColor}
      strokeWidth={2}
      strokeOpacity={0.8}
    />
  ) : (
    <g transform={`translate(${-node.size/2},${-node.size/2}) scale(${node.size/24})`}>
      <path
        d={personPath}
        fill={node.color}
        stroke={node.borderColor}
        strokeWidth={1}
        strokeOpacity={0.8}
      />
    </g>
  );
};

const NetworkPlot = ({ data, theme }) => {
  // Debug log
  console.log('NetworkPlot received data:', data);

  // Add error boundary
  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: theme === 'dark' ? '#ffffff' : '#333333'
      }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{ height: "400px", minHeight: "400px", width: "100%" }}>
      <ResponsiveNetwork
        data={data}
        margin={{ top: 40, right: 120, bottom: 40, left: 120 }}
        linkDistance={link => link.distance}
        nodeSize={node => node.size}
        activeNodeSize={node => 1.5 * node.size}
        nodeColor={node => node.color}
        linkThickness={link => 2 + 2 * link.target.data.height}
        linkBlendMode="multiply"
        centeringStrength={0.2}        // Reduced for less aggressive centering
        repulsivity={12}              // Increased to push nodes apart more
        iterations={120}              // More iterations for better layout
        nodeComponent={CustomNode}
        linkColor={{ from: 'source.color' }}
        linkOpacity={0.5}            // Make links more visible
        motionConfig="gentle"        // Smoother animations
        distanceMin={60}             // Minimum distance between nodes
        distanceMax={300}            // Maximum distance between nodes
        theme={{
          textColor: theme === 'dark' ? '#ffffff' : '#333333',
          fontSize: 12,
        }}
        animate={true}
      />
    </div>
  );
};

export default NetworkPlot; 