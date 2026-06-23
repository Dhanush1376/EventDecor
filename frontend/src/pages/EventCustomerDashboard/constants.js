export const STATUS_STEPS = [
  { id: 'inquiry', label: 'Inquiry Received', desc: 'Our design team is checking setup details' },
  {
    id: 'review',
    label: 'Under Review',
    desc: 'Design architects are mapping prop blueprint dimensions',
  },
  {
    id: 'discussion',
    label: 'Design Workspace',
    desc: 'Live color palette and layout adjustments',
  },
  {
    id: 'quotation_sent',
    label: 'Quotation Compiled',
    desc: 'Quotation is active. Awaiting your approval',
  },
  {
    id: 'confirmed',
    label: 'Booking Confirmed',
    desc: 'Logistics, vehicles, and inventories are locked',
  },
  { id: 'team_assigned', label: 'Artisans Assigned', desc: 'Setup crews and site leads allocated' },
  {
    id: 'setup_in_progress',
    label: 'Setup In Progress',
    desc: 'Crews are assembling structures onsite',
  },
  { id: 'active', label: 'Event Active', desc: 'The cinematic setup is complete & live' },
  {
    id: 'pickup_scheduled',
    label: 'Pickup Scheduled',
    desc: 'Crews returning to venue for catalog disassembly',
  },
  { id: 'completed', label: 'Completed', desc: 'Logistics completed & inventory returned' },
];
