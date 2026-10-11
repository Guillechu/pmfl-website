import { motion } from 'framer-motion';

/**
 * The waiting screen's background: footballs and a soft shape, drifting.
 *
 * A countdown with four days on it is a still picture, and a still picture on
 * a television reads as a frozen one. This gives the screen a pulse without
 * asking anyone to look at it: everything is behind the content, well under
 * the text in contrast, and slow enough that you notice it only if you stare.
 *
 * Colours come from the palette rather than from anywhere new, and every
 * animation here stops under the low-motion setting, which disables
 * transitions and animations wholesale in index.css.
 */

/** A ball, its size in rem, where it sits, and how long one drift takes. */
const BALLS = [
  { top: '14%', size: 7.5, drift: 38, delay: 0, from: '-14rem', to: '112vw', tilt: -18, color: '#A67512' },
  { top: '62%', size: 5.5, drift: 52, delay: 6, from: '112vw', to: '-12rem', tilt: 24, color: '#16222F' },
  { top: '34%', size: 4, drift: 64, delay: 18, from: '-10rem', to: '110vw', tilt: 8, color: '#2F6F4E' },
  { top: '80%', size: 6.5, drift: 46, delay: 11, from: '110vw', to: '-12rem', tilt: -30, color: '#7A3E86' },
];

export function PreDraftAmbience() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <Blob />
      {BALLS.map((ball, index) => (
        <motion.div
          key={index}
          className="absolute"
          style={{ top: ball.top }}
          initial={{ x: ball.from }}
          animate={{ x: [ball.from, ball.to] }}
          transition={{
            duration: ball.drift,
            delay: ball.delay,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'linear',
          }}
        >
          <motion.div
            animate={{ y: [0, -18, 0], rotate: [ball.tilt, ball.tilt + 12, ball.tilt] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Football size={ball.size} color={ball.color} />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

/** The shapeless one: a wide, very soft wash that breathes across the middle. */
function Blob() {
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 h-[60rem] w-[86rem] -translate-x-1/2 -translate-y-1/2 rounded-[50%] opacity-[0.07] blur-[3rem]"
      style={{
        background:
          'radial-gradient(ellipse at 30% 40%, #A67512 0%, transparent 55%), radial-gradient(ellipse at 70% 60%, #2F6F4E 0%, transparent 55%)',
      }}
      animate={{ scale: [1, 1.12, 1], x: ['-4rem', '4rem', '-4rem'] }}
      transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function Football({ size, color }: { size: number; color: string }) {
  return (
    <svg
      viewBox="0 0 100 62"
      style={{ width: `${size}rem`, height: `${size * 0.62}rem`, opacity: 0.18 }}
      fill="none"
    >
      <path
        d="M4 31C4 31 24 4 50 4s46 27 46 27-20 27-46 27S4 31 4 31Z"
        fill={color}
        fillOpacity="0.35"
        stroke={color}
        strokeWidth="3"
      />
      {/* Laces: the one detail that makes the shape read as a football. */}
      <path d="M36 31h28" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {[42, 50, 58].map((x) => (
        <path key={x} d={`M${x} 25v12`} stroke={color} strokeWidth="3" strokeLinecap="round" />
      ))}
      <path d="M17 22c-3 6-3 12 0 18M83 22c3 6 3 12 0 18" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
