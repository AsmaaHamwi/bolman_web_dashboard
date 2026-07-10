import { cx } from '../../utils/format';

type StaggerChildrenProps = {
  children: React.ReactNode;
  className?: string;
  staggerClassName?: string;
};

export function StaggerChildren({ children, className, staggerClassName }: StaggerChildrenProps) {
  return (
    <div className={cx('bolman-stagger', staggerClassName, className)}>
      {children}
    </div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('bolman-stagger-item', className)}>{children}</div>;
}
