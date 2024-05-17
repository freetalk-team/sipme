
# Examples

# Test server
```
node server.js
```

[Open in browser](http://127.0.0.1:3010/template/pretty.html)

## Template rendering

1. Variables

```
<template id="person">
	<b>{{this.name}}</b>
	<i>{{this.age}}</i>
</template>

<script>
	let e = render('person', { name: 'John', age: 40 });
	document.body.appendChild(e);
</script>
```

2. Conditions

```
<template id="person">
	<b>{{this.name}}</b>
	<i>{{this.age}}</i>
	@if{{this.age < 18}}
		<h1>Warn: Not appropriate content</h1>
	@endif
</template>
```

3. Loops

```
<template id="persons">
	@foreach{{this}}
		<b>{{this.name}}</b>
		<i>{{this.age}}</i>
	@endforeach
</template>
```

4. Templates

```
<template id="persons">
	@foreach{{this}}
		[[person]]
	@endforeach
</template>
```

5. Special variables

**_N** refers to Nth param

Note: Inside *foreach* block **_0** is the length of array

6. Passing parameters

```
<template id="persons">
	@foreach{{this}}
		[[person,li]]
	@endforeach
</template>

<script>
	let e = render('persons', [{ name: 'John', age: 40 }], 'ul');
	document.body.appendChild(e);
</script>
```
