import React, { useState, useEffect } from 'react';

interface Props {
  componentId: string;
  fallback: React.ReactNode;
  children: React.ReactNode;
}

export const DynamicHtml5Container: React.FC<Props> = ({ componentId, fallback, children }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset error state if componentId changes
    setHasError(false);
  }, [componentId]);

  if (hasError) {
    return <div className="p-4 border border-amber-900 rounded bg-amber-950/20">{fallback}</div>;
  }

  try {
    return <>{children}</>;
  } catch (err) {
    console.error(`Dynamic component ${componentId} failed:`, err);
    setHasError(true);
    return <div className="p-4 border border-amber-900 rounded bg-amber-950/20">{fallback}</div>;
  }
};
