import { memo } from 'react';

const AnimatedTagline = memo(() => {
  return (
    <div className="animated-tagline-container">
      <h2 className="animated-tagline">
        Lammiin Barate Gaaffii Mirgaa Gaafata
      </h2>
    </div>
  );
});

AnimatedTagline.displayName = 'AnimatedTagline';

export default AnimatedTagline;
