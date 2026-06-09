export function ResourceIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ width: '18px', height: '14px', verticalAlign: 'middle', marginRight: '4px' }}
    />
  );
}
