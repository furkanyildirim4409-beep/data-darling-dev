import { Users, Dumbbell, Apple, DollarSign, Shield, ShoppingBag, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { GranularPermissions } from '@/types/permissions';

interface PermissionMatrixProps {
  value: GranularPermissions;
  onChange: (val: GranularPermissions) => void;
  disabled?: boolean;
}

type ModuleConfig = {
  key: keyof GranularPermissions;
  label: string;
  icon: React.ElementType;
  fields: { key: string; label: string }[];
};

const MODULES: ModuleConfig[] = [
  {
    key: 'athletes',
    label: 'Sporcular',
    icon: Users,
    fields: [
      { key: 'view', label: 'Görüntüleme' },
      { key: 'edit', label: 'Düzenleme' },
      { key: 'delete', label: 'Silme' },
    ],
  },
  {
    key: 'workouts',
    label: 'Antrenmanlar',
    icon: Dumbbell,
    fields: [
      { key: 'view', label: 'Görüntüleme' },
      { key: 'create', label: 'Oluşturma' },
      { key: 'edit', label: 'Düzenleme' },
      { key: 'delete', label: 'Silme' },
      { key: 'assign', label: 'Atama' },
    ],
  },
  {
    key: 'diets',
    label: 'Diyetler',
    icon: Apple,
    fields: [
      { key: 'view', label: 'Görüntüleme' },
      { key: 'create', label: 'Oluşturma' },
      { key: 'edit', label: 'Düzenleme' },
      { key: 'delete', label: 'Silme' },
      { key: 'assign', label: 'Atama' },
    ],
  },
  {
    key: 'finances',
    label: 'Finans',
    icon: DollarSign,
    fields: [
      { key: 'view', label: 'Görüntüleme' },
      { key: 'manage', label: 'Yönetim' },
    ],
  },
  {
    key: 'team',
    label: 'Takım',
    icon: Shield,
    fields: [
      { key: 'view', label: 'Görüntüleme' },
      { key: 'invite', label: 'Davet Etme' },
      { key: 'editPermissions', label: 'Yetki Düzenleme' },
    ],
  },
];

export function PermissionMatrix({ value, onChange, disabled = false }: PermissionMatrixProps) {
  const handleToggle = (module: keyof GranularPermissions, field: string, checked: boolean) => {
    onChange({
      ...value,
      [module]: {
        ...value[module],
        [field]: checked,
      },
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {MODULES.map((mod) => {
        const Icon = mod.icon;
        const moduleData = value[mod.key] as Record<string, boolean>;

        return (
          <Card key={mod.key} className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                {mod.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mod.fields.map((field) => {
                const id = `${mod.key}-${field.key}`;
                return (
                  <div key={id} className="flex items-center justify-between">
                    <Label htmlFor={id} className="text-sm text-muted-foreground cursor-pointer">
                      {field.label}
                    </Label>
                    <Switch
                      id={id}
                      checked={!!moduleData?.[field.key]}
                      onCheckedChange={(checked) => handleToggle(mod.key, field.key, checked)}
                      disabled={disabled}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
