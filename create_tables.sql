-- Create students table
create table if not exists students (
    student_number varchar primary key,
    student_name varchar,
    grade varchar,
    fees_paid decimal,
    balance decimal,
    date date,
    phone_number varchar,
    gender varchar,
    address text,
    email varchar,
    term varchar,
    year varchar,
    payment_history jsonb
);

-- Create school_fees table
create table if not exists school_fees (
    id serial primary key,
    grade varchar,
    amount decimal,
    term varchar,
    year varchar,
    unique(grade, term, year)
);

-- Enable Row Level Security (RLS)
alter table students enable row level security;
alter table school_fees enable row level security;

-- Create policies for anonymous access
create policy "Allow anonymous read access to students"
    on students for select
    to anon
    using (true);

create policy "Allow anonymous write access to students"
    on students for insert
    to anon
    with check (true);

create policy "Allow anonymous update access to students"
    on students for update
    to anon
    using (true);

create policy "Allow anonymous delete access to students"
    on students for delete
    to anon
    using (true);

create policy "Allow anonymous read access to school_fees"
    on school_fees for select
    to anon
    using (true);

create policy "Allow anonymous write access to school_fees"
    on school_fees for insert
    to anon
    with check (true);

create policy "Allow anonymous update access to school_fees"
    on school_fees for update
    to anon
    using (true);

create policy "Allow anonymous delete access to school_fees"
    on school_fees for delete
    to anon
    using (true);

-- Create indexes for better performance
create index if not exists students_grade_idx on students(grade);
create index if not exists students_term_year_idx on students(term, year);
create index if not exists school_fees_grade_idx on school_fees(grade);
create index if not exists school_fees_term_year_idx on school_fees(term, year); 